/**
 * Represents a UI layer associated with a DOM element, providing behavior for
 * checking its open state and closing it.
 */
interface Layer {
    el: HTMLElement;
    isOpen: (el: HTMLElement) => boolean;
    close: () => void;
}

/**
 * Manages browser history integration for transient UI layers such as dialogs, popups, overlays, or panels.
 *
 * Tracks registered layer elements, observes class and style changes, detects when layers open or close,
 * and maintains a stack that mirrors the currently open layer order. Opening a layer creates a synthetic
 * history entry, allowing the browser back action to close the topmost tracked layer instead of immediately
 * navigating away from the page.
 *
 * Programmatic layer closures are synchronized with the history stack. When a layer closes, its matching
 * stack entry is removed and the corresponding browser history entry is consumed. If a layer closes and
 * another layer opens during the same mutation cycle, the existing history entry is reused to avoid conflicts
 * between history navigation and state creation.
 *
 * On construction, any stale layer history state from a previous lifecycle is cleared, and a popstate listener
 * is installed to close the latest tracked layer when the user navigates backward.
 *
 * @param isEnabled Function used to determine whether layer openings should participate in browser history management.
 */
export class LayerManager {
    private layers = new Map<HTMLElement, Layer>();
    private wasOpen = new Map<HTMLElement, boolean>();
    // Layers that have an history entry, the top one last
    private stack: HTMLElement[] = [];
    private ignoredPops = 0;
    private observer: MutationObserver;
    private isEnabled: () => boolean;

    constructor(isEnabled: () => boolean) {
        this.isEnabled = isEnabled;
        this.observer = new MutationObserver(() => this.onChange());

        // A reload keeps the entries but not the stack: unmark the current one
        if (history.state?.acmLayer) history.replaceState(null, '');

        window.addEventListener('popstate', () => {
            if (this.ignoredPops > 0) {
                this.ignoredPops--;
                return;
            }
            const el = this.stack.pop();
            if (!el) return;
            this.layers.get(el)?.close();
        });
    }

    /**
     * Registers an element as a managed layer, stores its initial open state, and begins observing
     * changes to its class and style attributes.
     *
     * @param el The HTML element to register.
     * @param isOpen A function that determines whether the registered element is currently open.
     * @param close A function that closes the registered element.
     * @return Nothing.
     */
    register(el: HTMLElement, isOpen: (el: HTMLElement) => boolean, close: () => void): void {
        this.layers.set(el, { el, isOpen, close });
        this.wasOpen.set(el, isOpen(el));
        this.observer.observe(el, { attributes: true, attributeFilter: ['class', 'style'] });
    }

    /**
     * Handles layer open state changes and synchronizes them with the browser history stack.
     *
     * Detects layers that have opened or closed since the previous check, updates the internal
     * stack accordingly, replaces history state when a layer closes while another opens, and
     * navigates back when a tracked layer closes without replacement. When enabled, newly opened
     * layers are pushed onto the browser history.
     *
     * @return Nothing.
     */
    private onChange(): void {
        const opened: HTMLElement[] = [];
        const closed: HTMLElement[] = [];
        for (const layer of this.layers.values()) {
            const open = layer.isOpen(layer.el);
            if (open === this.wasOpen.get(layer.el)) continue;
            this.wasOpen.set(layer.el, open);
            (open ? opened : closed).push(layer.el);
        }
        for (const el of closed) {
            const index = this.stack.lastIndexOf(el);
            if (index === -1) continue;
            this.stack.splice(index, 1);
            // One layer closed and another opened at once (e.g. the creation popup closes
            // the details): reuse the entry, as history.back() and pushState would race
            const next = opened.shift();
            if (next) {
                history.replaceState({ acmLayer: true }, '');
                this.stack.push(next);
            } else {
                this.ignoredPops++;
                history.back();
            }
        }
        if (!this.isEnabled()) return;
        for (const el of opened) {
            history.pushState({ acmLayer: true }, '');
            this.stack.push(el);
        }
    }
}

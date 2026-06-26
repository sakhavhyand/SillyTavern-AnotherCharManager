interface VirtualScrollerOptions {
    container: HTMLElement;
    items?: any[];
    renderItem?: (item: any) => HTMLElement;
    itemHeight?: number;
    itemsPerRow?: number;
    buffer?: number;
}

const DEFAULT_VIRTUAL_SCROLLER_OPTIONS: Partial<VirtualScrollerOptions> = {
    items: [],
    itemHeight: 150,
    itemsPerRow: 5,
    buffer: 2,
};

interface VisibleRange {
    start: number;
    end: number;
}

/**
 * A class for rendering a virtualized scrolling container, improving performance
 * for large data sets by only rendering visible elements and placeholders.
 */
export class VirtualScroller {
    static EMPTY_IMG = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

    container: HTMLElement;
    items: any[];
    renderItem: (item: any) => HTMLElement;
    itemHeight: number;
    itemsPerRow: number;
    buffer: number;

    private _onScroll: (() => void) | null;
    private _renderScheduled: boolean;
    private _pendingPreserveScroll: boolean;

    constructor(options: VirtualScrollerOptions) {
        this.container = options.container;
        this.items = options.items ?? DEFAULT_VIRTUAL_SCROLLER_OPTIONS.items!;
        this.renderItem = options.renderItem ?? (() => document.createElement('div'));
        this.itemHeight = options.itemHeight ?? DEFAULT_VIRTUAL_SCROLLER_OPTIONS.itemHeight!;
        this.itemsPerRow = options.itemsPerRow ?? DEFAULT_VIRTUAL_SCROLLER_OPTIONS.itemsPerRow!;
        this.buffer = options.buffer ?? DEFAULT_VIRTUAL_SCROLLER_OPTIONS.buffer!;
        this._onScroll = null;
        this._renderScheduled = false;
        this._pendingPreserveScroll = false;
        this.init();
    }

    init(): void {
        if (!this.container) {
            console.error('VirtualScroller: container is required');
            return;
        }

        this.container.innerHTML = '';
        this._onScroll = () => this.render();
        this.container.addEventListener('scroll', this._onScroll, { passive: true });
        this._doRender();
    }

    calculateVisibleRange(): VisibleRange {
        const scrollTop = this.container.scrollTop;
        const containerHeight = this.container.clientHeight;

        // Calculate visible rows
        const startRow = Math.floor(scrollTop / this.itemHeight);
        const endRow = Math.ceil((scrollTop + containerHeight) / this.itemHeight);

        // Add buffer
        const bufferedStartRow = Math.max(0, startRow - this.buffer);
        const bufferedEndRow = Math.min(
            Math.ceil(this.items.length / this.itemsPerRow),
            endRow + this.buffer,
        );

        // Convert to item indices
        const start = bufferedStartRow * this.itemsPerRow;
        const end = Math.min(bufferedEndRow * this.itemsPerRow, this.items.length);

        return { start, end };
    }

    /**
     * Schedules a render on the next animation frame. If a render is already
     * scheduled, this call is a no-op, effectively throttling to ~60 fps.
     */
    render(preserveScroll: boolean = false): void {
        if (this._renderScheduled) return;
        this._renderScheduled = true;
        this._pendingPreserveScroll = preserveScroll;
        requestAnimationFrame(() => {
            this._renderScheduled = false;
            this._doRender(this._pendingPreserveScroll);
        });
    }

    /**
     * Internal render — recycles DOM elements that are still visible, creates
     * new ones for items that just scrolled in, and removes elements that
     * scrolled out (cancelling their in-flight image loads first).
     */
    private _doRender(preserveScroll: boolean = false): void {
        const newRange = this.calculateVisibleRange();
        const scrollTop = preserveScroll ? this.container.scrollTop : null;

        // Build set of avatars that should be visible
        const neededAvatars = new Set<string>();
        for (let i = newRange.start; i < newRange.end; i++) {
            if (this.items[i]) neededAvatars.add(this.items[i].avatar);
        }

        // Separate existing elements: keep vs remove
        const keptElements = new Map<string, Element>();
        this.container.querySelectorAll('[data-avatar]').forEach(el => {
            const avatar = el.getAttribute('data-avatar');
            if (avatar && neededAvatars.has(avatar)) {
                keptElements.set(avatar, el);
            } else {
                const img = el.querySelector('img');
                if (img) img.src = VirtualScroller.EMPTY_IMG;
                el.remove();
            }
        });

        // Build fragment: spacers + recycled items + new items
        const fragment = document.createDocumentFragment();

        if (newRange.start > 0) {
            const topSpacer = document.createElement('div');
            topSpacer.style.cssText =
                `height:${Math.floor(newRange.start / this.itemsPerRow) * this.itemHeight}px;width:100%;flex-shrink:0`;
            fragment.appendChild(topSpacer);
        }

        for (let i = newRange.start; i < newRange.end; i++) {
            const item = this.items[i];
            if (!item) continue;
            if (keptElements.has(item.avatar)) {
                fragment.appendChild(keptElements.get(item.avatar)!);
            } else {
                fragment.appendChild(this.renderItem(item));
            }
        }

        const remainingItems = this.items.length - newRange.end;
        if (remainingItems > 0) {
            const bottomSpacer = document.createElement('div');
            bottomSpacer.style.cssText =
                `height:${Math.ceil(remainingItems / this.itemsPerRow) * this.itemHeight}px;width:100%;flex-shrink:0`;
            fragment.appendChild(bottomSpacer);
        }

        // Cancel any straggler images then swap content
        this.container.querySelectorAll('img').forEach(img => { img.src = VirtualScroller.EMPTY_IMG; });
        this.container.replaceChildren(fragment);

        if (preserveScroll && scrollTop !== null) {
            this.container.scrollTop = scrollTop;
        }
    }

    /**
     * Updates the list of items and triggers re-rendering.
     */
    setItems(items: any[], preserveScroll: boolean = false): void {
        this.items = items;
        this.render(preserveScroll);
    }

    /**
     * Refreshes the display (useful after resize)
     */
    refresh(): void {
        this.render(true);
    }

    /**
     * Gets the index of an item by its avatar
     */
    getIndexByAvatar(avatar: string): number {
        return this.items.findIndex(item => item.avatar === avatar);
    }

    /**
     * Scrolls to a specific item by its avatar string
     */
    scrollToAvatar(avatar: string, behavior: ScrollBehavior = 'auto'): void {
        // Find the index of the item with this avatar
        const index = this.getIndexByAvatar(avatar);

        if (index === -1) {
            console.warn(`Item with avatar "${avatar}" not found`);
            return;
        }

        // Calculate which row this item is in
        const row = Math.floor(index / this.itemsPerRow);
        const scrollTop = row * this.itemHeight;

        // Scroll to position
        this.container.scrollTo({
            top: scrollTop,
            behavior: behavior,
        });
    }

    /**
     * Cleans up resources
     */
    destroy(): void {
        if (this._onScroll) {
            this.container.removeEventListener('scroll', this._onScroll);
            this._onScroll = null;
        }
        this.container.querySelectorAll('img').forEach(img => { img.src = VirtualScroller.EMPTY_IMG; });
        this.container.innerHTML = '';
    }
}

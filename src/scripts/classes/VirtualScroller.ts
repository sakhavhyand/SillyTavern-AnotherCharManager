import {
    elementScroll,
    observeElementOffset,
    observeElementRect,
    Virtualizer,
    type VirtualizerOptions,
} from '@tanstack/virtual-core';

interface VirtualScrollerOptions {
    container: HTMLElement;
    items?: any[];
    renderItem?: (item: any) => HTMLElement;
    /** Stable identity of an item, used to reuse its rendered element. Defaults to `item.avatar`. */
    getItemKey?: (item: any, index: number) => string;
    /**
     * What the item's rendered element displays. A rendered element is reused only
     * while its version is unchanged (compared with ===). Defaults to the item itself.
     */
    getItemVersion?: (item: any) => unknown;
    itemHeight?: number;
    itemWidth?: number;
    itemsPerRow?: number;
    buffer?: number;
    /** Called instead of the built-in refresh when the container width changes. */
    onResize?: (width: number) => void;
}

const DEFAULT_VIRTUAL_SCROLLER_OPTIONS = {
    items: [] as any[],
    itemHeight: 150,
    itemWidth: 120,
    itemsPerRow: 5,
    buffer: 2,
};

const LAYOUT_ANIMATION_DURATION = 400;

interface RenderedRow {
    el: HTMLElement;
    /** Keys of the items currently rendered in the row; null forces a rebuild. */
    signature: string | null;
}

interface RenderedCard {
    el: HTMLElement;
    /** getItemVersion() of the item when the element was rendered. */
    version: unknown;
}

/**
 * Grid-oriented wrapper around TanStack Virtual Core. TanStack virtualizes
 * rows; each virtual row renders `itemsPerRow` character cards.
 */
export class VirtualScroller {
    container: HTMLElement;
    items: any[];
    renderItem: (item: any) => HTMLElement;
    getItemKey: (item: any, index: number) => string;
    getItemVersion: (item: any) => unknown;
    buffer: number;
    onResize: ((width: number) => void) | null;

    private _itemHeight: number;
    private _lastWidth = 0;
    private _itemWidth: number;
    private _itemsPerRow: number;
    private _autoItemsPerRow: boolean;
    private _virtualizer: Virtualizer<HTMLElement, HTMLElement>;
    private _cleanupVirtualizer: (() => void) | null = null;
    private _resizeObserver: ResizeObserver | null = null;
    private _renderScheduled = false;
    private _renderFrame: number | null = null;
    private _pendingPreserveScroll = false;
    private _destroyed = false;
    private _animateNextLayout = false;
    private _suppressVirtualizerRender = false;
    private _canvas: HTMLElement | null = null;
    /** Rendered rows by virtual row index. */
    private _rows = new Map<number, RenderedRow>();
    /** Rendered cards by item key (only those currently in the DOM). */
    private _cards = new Map<string, RenderedCard>();

    constructor(options: VirtualScrollerOptions) {
        this.container = options.container;
        this.items = options.items ?? DEFAULT_VIRTUAL_SCROLLER_OPTIONS.items;
        this.renderItem = options.renderItem ?? (() => document.createElement('div'));
        this.getItemKey = options.getItemKey ?? ((item, index) => String(item?.avatar ?? index));
        this.getItemVersion = options.getItemVersion ?? (item => item);
        this._itemHeight = options.itemHeight ?? DEFAULT_VIRTUAL_SCROLLER_OPTIONS.itemHeight;
        this._itemWidth = options.itemWidth ?? DEFAULT_VIRTUAL_SCROLLER_OPTIONS.itemWidth;
        this._autoItemsPerRow = options.itemsPerRow === undefined;
        this._itemsPerRow = Math.max(1, Math.floor(Number(options.itemsPerRow) || DEFAULT_VIRTUAL_SCROLLER_OPTIONS.itemsPerRow));
        this.buffer = options.buffer ?? DEFAULT_VIRTUAL_SCROLLER_OPTIONS.buffer;
        this.onResize = options.onResize ?? null;

        this._virtualizer = new Virtualizer(this._virtualizerOptions());
        this.init();
    }

    get itemHeight(): number {
        return this._itemHeight;
    }

    set itemHeight(value: number) {
        if (value <= 0 || value === this._itemHeight) return;
        this._itemHeight = value;
        this._updateVirtualizer();
    }

    get itemWidth(): number {
        return this._itemWidth;
    }

    set itemWidth(value: number) {
        const nextValue = Math.max(1, Math.floor(value));
        if (nextValue === this._itemWidth) return;
        this._itemWidth = nextValue;
        if (this._autoItemsPerRow) {
            const width = this.container.clientWidth;
            if (width > 0) {
                const calculated = Math.max(1, Math.floor(width / this._itemWidth));
                if (calculated !== this._itemsPerRow) {
                    this._itemsPerRow = calculated;
                    this._animateNextLayout = true;
                    this.refresh();
                }
            }
        }
    }

    get itemsPerRow(): number {
        return this._itemsPerRow;
    }

    set itemsPerRow(value: number) {
        const nextValue = Math.max(1, Math.floor(Number(value) || DEFAULT_VIRTUAL_SCROLLER_OPTIONS.itemsPerRow));
        this._autoItemsPerRow = false;
        if (nextValue === this._itemsPerRow) return;
        this._itemsPerRow = nextValue;
        this._animateNextLayout = true;
        this._updateVirtualizer();
        this.render(true);
    }

    private _virtualizerOptions(): VirtualizerOptions<HTMLElement, HTMLElement> {
        const itemsPerRow = Math.max(1, Math.floor(Number(this._itemsPerRow) || DEFAULT_VIRTUAL_SCROLLER_OPTIONS.itemsPerRow));
        const itemCount = Array.isArray(this.items) ? this.items.length : 0;
        return {
            count: Math.ceil(itemCount / itemsPerRow),
            getScrollElement: () => this.container,
            estimateSize: () => Math.max(1, this._itemHeight || DEFAULT_VIRTUAL_SCROLLER_OPTIONS.itemHeight),
            getItemKey: index => index,
            overscan: Math.max(0, this.buffer || 0),
            observeElementRect,
            observeElementOffset,
            scrollToFn: elementScroll,
            onChange: () => {
                if (!this._suppressVirtualizerRender) this.render(true);
            },
        };
    }

    private _updateVirtualizer(): void {
        this._virtualizer.setOptions(this._virtualizerOptions());
        this._virtualizer._willUpdate();
    }

    init(): void {
        this._destroyed = false;
        this._canvas = document.createElement('div');
        this._canvas.style.cssText = 'height:0;width:100%;position:relative;flex-shrink:0';
        this._rows.clear();
        this._cards.clear();
        this.container.replaceChildren(this._canvas);
        this._cleanupVirtualizer = this._virtualizer._didMount();
        this._virtualizer._willUpdate();
        this._resizeObserver = new ResizeObserver(entries => {
            const width = entries[0]?.contentRect.width;
            if (!width || this._destroyed) return;

            // Height-only changes (e.g. the popup growing taller) don't affect
            // the grid layout; TanStack already tracks the viewport height.
            if (width === this._lastWidth) return;
            this._lastWidth = width;

            if (this.onResize) {
                this.onResize(width);
                return;
            }

            if (this._autoItemsPerRow) {
                const itemsPerRow = Math.max(1, Math.floor(width / this._itemWidth));
                if (itemsPerRow !== this._itemsPerRow) {
                    this._itemsPerRow = itemsPerRow;
                    this._animateNextLayout = true;
                    this.refresh();
                    return;
                }
            }
            this.refresh();
        });
        this._resizeObserver.observe(this.container);
        this._doRender();
    }

    render(preserveScroll: boolean = false): void {
        if (this._destroyed) return;
        this._pendingPreserveScroll ||= preserveScroll;
        if (this._renderScheduled) return;

        this._renderScheduled = true;
        this._renderFrame = requestAnimationFrame(() => {
            this._renderFrame = null;
            this._renderScheduled = false;
            if (this._destroyed) return;
            const shouldPreserveScroll = this._pendingPreserveScroll;
            this._pendingPreserveScroll = false;
            this._doRender(shouldPreserveScroll);
        });
    }

    private _doRender(preserveScroll: boolean = false): void {
        if (!this._canvas) return;
        const scrollTop = preserveScroll ? this.container.scrollTop : null;
        const animateLayout = this._animateNextLayout;
        this._animateNextLayout = false;
        const previousPositions = new Map<string, DOMRect>();
        if (animateLayout) {
            this.container.querySelectorAll<HTMLElement>('[data-avatar]').forEach(item => {
                const avatar = item.dataset.avatar;
                if (avatar) previousPositions.set(avatar, item.getBoundingClientRect());
            });
        }

        const itemsPerRow = Math.max(1, Math.floor(Number(this._itemsPerRow) || DEFAULT_VIRTUAL_SCROLLER_OPTIONS.itemsPerRow));
        const canvas = this._canvas!;
        canvas.style.height = `${Math.max(0, this._virtualizer.getTotalSize() || 0)}px`;
        const renderedRows: HTMLElement[] = [];

        // Rows and cards that are still visible are kept as-is; only rows whose
        // content changed are rebuilt, and they reuse existing cards by key as
        // long as the card's version (what it displays) is unchanged. This keeps
        // scrolling and list refreshes cheap and avoids reloading images or
        // losing hover state.
        const nextRows = new Map<number, RenderedRow>();
        const nextCards = new Map<string, RenderedCard>();
        const isCurrent = (key: string, version: unknown) => {
            const card = this._cards.get(key);
            return card !== undefined && card.version === version;
        };
        const virtualItems = this._virtualizer.getVirtualItems() || [];
        for (const virtualRow of virtualItems) {
            if (!virtualRow || typeof virtualRow.index !== 'number') continue;

            const start = virtualRow.index * itemsPerRow;
            const end = Math.min(start + itemsPerRow, (this.items?.length || 0));
            const entries: { item: any; key: string; version: unknown }[] = [];
            for (let index = start; index < end; index++) {
                const item = this.items[index];
                if (item !== undefined) entries.push({ item, key: this.getItemKey(item, index), version: this.getItemVersion(item) });
            }
            const signature = entries.map(entry => entry.key).join('\n');

            let row = this._rows.get(virtualRow.index);
            if (!row) {
                const el = document.createElement('div');
                el.dataset.index = String(virtualRow.index);
                // One equal-width grid column per item, item centered in it: a partial
                // last row stays aligned with the columns of the full rows above.
                el.style.cssText = 'position:absolute;top:0;left:0;width:100%;display:grid;justify-items:center;align-items:stretch';
                canvas.appendChild(el);
                row = { el, signature: null };
            }

            if (row.signature !== signature || !entries.every(({ key, version }) => isCurrent(key, version))) {
                const cards: HTMLElement[] = [];
                for (const { item, key, version } of entries) {
                    let el = isCurrent(key, version) ? this._cards.get(key)!.el : null;
                    if (!el) {
                        el = this.renderItem(item);
                        if (!el) continue;
                        el.style.flexShrink = '0';
                        el.style.boxSizing = 'border-box';
                    }
                    cards.push(el);
                    nextCards.set(key, { el, version });
                }
                row.el.replaceChildren(...cards);
                row.signature = signature;
            } else {
                for (const { key } of entries) {
                    nextCards.set(key, this._cards.get(key)!);
                }
            }

            row.el.style.gridTemplateColumns = `repeat(${itemsPerRow}, minmax(0, 1fr))`;
            row.el.style.transform = `translateY(${virtualRow.start || 0}px)`;
            nextRows.set(virtualRow.index, row);
            renderedRows.push(row.el);
        }

        for (const [index, row] of this._rows) {
            if (!nextRows.has(index)) row.el.remove();
        }
        // Only cards currently in the DOM are kept, so DOM-based state changes
        // (e.g. the selected card class) can never go stale in the cache.
        this._rows = nextRows;
        this._cards = nextCards;

        if (scrollTop !== null) this.container.scrollTop = scrollTop;

        // Rows have natural height. Flexbox derives that height from the
        // tallest card (including its margin), then stretches its siblings.
        // Measure once per render rather than observing continuously: hover
        // styles alter card borders/transforms and must not trigger a render
        // loop that repeatedly replaces the hovered card.
        if (animateLayout) this._suppressVirtualizerRender = true;
        try {
            for (const row of renderedRows) {
                const index = Number(row.dataset.index);
                const height = row.getBoundingClientRect().height;
                if (height > 0) {
                    this._virtualizer.resizeItem(index, height);
                }
            }
        }
        finally {
            this._suppressVirtualizerRender = false;
        }

        if (animateLayout) {
            // resizeItem updates TanStack's offsets synchronously. Apply those
            // final offsets to these same nodes so the following FLIP
            // animation is not destroyed by an intermediate render.
            const measuredRows = new Map(
                (this._virtualizer.getVirtualItems() || [])
                    .filter(Boolean)
                    .map(row => [row.index, row]),
            );
            for (const row of renderedRows) {
                const measurement = measuredRows.get(Number(row.dataset.index));
                if (measurement && typeof measurement.start === 'number') {
                    row.style.transform = `translateY(${measurement.start}px)`;
                }
            }
            canvas.style.height = `${this._virtualizer.getTotalSize() || 0}px`;
            this._animateLayoutFrom(previousPositions);

            // Reconcile the virtual range after the CSS transition has ended.
            setTimeout(() => this.render(true), LAYOUT_ANIMATION_DURATION + 50);
        }

        // Scrolling re-renders through the virtualizer, so this also tracks scroll.
        this._updateScrollFade();
    }

    /** Fade the bottom edge only while more rows are hidden below it. */
    private _updateScrollFade(): void {
        const { scrollTop, scrollHeight, clientHeight } = this.container;
        this.container.classList.toggle('acm_fade_bottom', scrollTop + clientHeight < scrollHeight - 2);
    }

    /** Smoothly move cards from their position in the previous grid layout. */
    private _animateLayoutFrom(previousPositions: Map<string, DOMRect>): void {
        const movedItems: HTMLElement[] = [];

        this.container.querySelectorAll<HTMLElement>('[data-avatar]').forEach(item => {
            const avatar = item.dataset.avatar;
            const previous = avatar ? previousPositions.get(avatar) : undefined;
            if (!previous) return;

            const current = item.getBoundingClientRect();
            const deltaX = previous.left - current.left;
            const deltaY = previous.top - current.top;
            if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return;

            item.style.transition = 'none';
            item.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
            movedItems.push(item);
        });

        if (movedItems.length === 0) return;
        requestAnimationFrame(() => requestAnimationFrame(() => {
            for (const item of movedItems) {
                item.style.transition = `transform ${LAYOUT_ANIMATION_DURATION}ms ease`;
                item.style.transform = '';
            }
        }));
    }

    setItems(items: any[], preserveScroll: boolean = false): void {
        // Cards whose version changed (edits, tag changes...) are rebuilt on the next
        // render; unchanged ones are reused.
        this.items = items;
        this._updateVirtualizer();
        this.render(preserveScroll);
    }

    /** Recalculate row measurements after the container layout changes. */
    refresh(): void {
        this._updateVirtualizer();
        this._virtualizer.measure();
        if (this._renderFrame !== null) cancelAnimationFrame(this._renderFrame);
        this._renderFrame = null;
        this._renderScheduled = false;
        this._pendingPreserveScroll = false;
        this._doRender(true);
    }

    getIndexByAvatar(avatar: string): number {
        return this.items.findIndex(item => item.avatar === avatar);
    }

    scrollToAvatar(avatar: string, behavior: ScrollBehavior = 'auto'): void {
        const index = this.getIndexByAvatar(avatar);
        if (index === -1) {
            console.warn(`Item with avatar "${avatar}" not found`);
            return;
        }

        this._virtualizer.scrollToIndex(Math.floor(index / this._itemsPerRow), {
            align: 'start',
            behavior,
        });
    }

    destroy(): void {
        this._destroyed = true;
        if (this._renderFrame !== null) cancelAnimationFrame(this._renderFrame);
        this._renderFrame = null;
        this._renderScheduled = false;
        this._cleanupVirtualizer?.();
        this._cleanupVirtualizer = null;
        this._resizeObserver?.disconnect();
        this._resizeObserver = null;
        this._rows.clear();
        this._cards.clear();
        this._canvas = null;
        this.container.replaceChildren();
    }
}

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
    itemHeight?: number;
    itemWidth?: number;
    itemsPerRow?: number;
    buffer?: number;
}

const DEFAULT_VIRTUAL_SCROLLER_OPTIONS = {
    items: [] as any[],
    itemHeight: 150,
    itemWidth: 120,
    itemsPerRow: 5,
    buffer: 2,
};

const LAYOUT_ANIMATION_DURATION = 400;

/**
 * Grid-oriented wrapper around TanStack Virtual Core. TanStack virtualizes
 * rows; each virtual row renders `itemsPerRow` character cards.
 */
export class VirtualScroller {
    container: HTMLElement;
    items: any[];
    renderItem: (item: any) => HTMLElement;
    itemHeight: number;
    itemWidth: number;
    buffer: number;

    private _itemsPerRow: number;
    private _virtualizer: Virtualizer<HTMLElement, HTMLElement>;
    private _cleanupVirtualizer: (() => void) | null = null;
    private _resizeObserver: ResizeObserver | null = null;
    private _renderScheduled = false;
    private _renderFrame: number | null = null;
    private _pendingPreserveScroll = false;
    private _destroyed = false;
    private _animateNextLayout = false;
    private _suppressVirtualizerRender = false;

    constructor(options: VirtualScrollerOptions) {
        this.container = options.container;
        this.items = options.items ?? DEFAULT_VIRTUAL_SCROLLER_OPTIONS.items;
        this.renderItem = options.renderItem ?? (() => document.createElement('div'));
        this.itemHeight = options.itemHeight ?? DEFAULT_VIRTUAL_SCROLLER_OPTIONS.itemHeight;
        this.itemWidth = options.itemWidth ?? DEFAULT_VIRTUAL_SCROLLER_OPTIONS.itemWidth;
        this._itemsPerRow = options.itemsPerRow ?? DEFAULT_VIRTUAL_SCROLLER_OPTIONS.itemsPerRow;
        this.buffer = options.buffer ?? DEFAULT_VIRTUAL_SCROLLER_OPTIONS.buffer;

        this._virtualizer = new Virtualizer(this._virtualizerOptions());
        this.init();
    }

    get itemsPerRow(): number {
        return this._itemsPerRow;
    }

    set itemsPerRow(value: number) {
        const nextValue = Math.max(1, Math.floor(value));
        if (nextValue === this._itemsPerRow) return;
        this._itemsPerRow = nextValue;
        this._animateNextLayout = true;
        this._updateVirtualizer();
    }

    private _virtualizerOptions(): VirtualizerOptions<HTMLElement, HTMLElement> {
        return {
            count: Math.ceil(this.items.length / this._itemsPerRow),
            getScrollElement: () => this.container,
            estimateSize: () => this.itemHeight,
            getItemKey: index => index,
            overscan: this.buffer,
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
        this.container.replaceChildren();
        this._cleanupVirtualizer = this._virtualizer._didMount();
        this._virtualizer._willUpdate();
        this._resizeObserver = new ResizeObserver(entries => {
            const width = entries[0]?.contentRect.width;
            if (!width || this._destroyed) return;

            const itemsPerRow = Math.max(1, Math.floor(width / this.itemWidth));
            if (itemsPerRow === this._itemsPerRow) return;
            this.itemsPerRow = itemsPerRow;
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

        const canvas = document.createElement('div');
        canvas.style.cssText = `height:${this._virtualizer.getTotalSize()}px;width:100%;position:relative;flex-shrink:0`;
        const renderedRows: HTMLElement[] = [];

        for (const virtualRow of this._virtualizer.getVirtualItems()) {
            const row = document.createElement('div');
            row.dataset.index = String(virtualRow.index);
            row.style.cssText = `position:absolute;top:0;left:0;width:100%;transform:translateY(${virtualRow.start}px);display:flex;justify-content:space-around;align-items:stretch`;

            const start = virtualRow.index * this._itemsPerRow;
            const end = Math.min(start + this._itemsPerRow, this.items.length);
            for (let index = start; index < end; index++) {
                const item = this.renderItem(this.items[index]);
                item.style.flexShrink = '0';
                item.style.boxSizing = 'border-box';
                row.appendChild(item);
            }
            canvas.appendChild(row);
            renderedRows.push(row);
        }

        this.container.replaceChildren(canvas);
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
                this._virtualizer.resizeItem(index, row.getBoundingClientRect().height);
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
                this._virtualizer.getVirtualItems().map(row => [row.index, row]),
            );
            for (const row of renderedRows) {
                const measurement = measuredRows.get(Number(row.dataset.index));
                if (measurement) row.style.transform = `translateY(${measurement.start}px)`;
            }
            canvas.style.height = `${this._virtualizer.getTotalSize()}px`;
            this._animateLayoutFrom(previousPositions);

            // Reconcile the virtual range after the CSS transition has ended.
            setTimeout(() => this.render(true), LAYOUT_ANIMATION_DURATION + 50);
        }
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
        this.container.replaceChildren();
    }
}

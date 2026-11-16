const { Popper } = SillyTavern.libs;

interface DropdownMenu {
    button: HTMLElement;
    menu: HTMLElement;
    popper: any;
}

export class MenuManager {
    private menus = new Map<string, DropdownMenu>();

    /**
     * Closes the menus on a click outside of them and of their buttons. Call once.
     * The registry is read at click time, so menus registered later are covered too.
     */
    init(): void {
        document.addEventListener('click', (event: MouseEvent) => {
            const target = event.target as Node;
            const inside = [...this.menus.values()].some(({ button, menu }) =>
                button.contains(target) || menu.contains(target));
            if (!inside) this.closeAll();
        });
    }

    /**
     * Registers a dropdown: `buttonId` opens `menuId`, positioned by a popper.
     * The template must already be in the page.
     */
    register(name: string, buttonId: string, menuId: string, placement: string): void {
        const button = document.getElementById(buttonId);
        const menu = document.getElementById(menuId);

        if (!button || !menu) {
            console.warn(`[ACM] Menu "${name}": #${buttonId} or #${menuId} not found`);
            return;
        }

        const popper = Popper.createPopper(button, menu, { placement });
        this.menus.set(name, { button, menu, popper });
    }

    toggle(name: string): void {
        const entry = this.menus.get(name);
        if (!entry) return;
        $(entry.menu).toggle();
        entry.popper.update();
    }

    closeAll(): void {
        for (const { menu } of this.menus.values()) $(menu).hide();
    }

    setPlacement(name: string, placement: string): void {
        this.menus.get(name)?.popper.setOptions({ placement });
    }
}

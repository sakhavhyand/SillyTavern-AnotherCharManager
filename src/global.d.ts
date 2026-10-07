// Global type declarations for the ACM extension

// SillyTavern global context
declare var SillyTavern: {
    getContext: () => any;
    libs: {
        Fuse: any;
        Popper: any;
    };
};

// Toastr
declare var toastr: {
    success: (msg: string) => void;
    error: (msg: string) => void;
    warning: (msg: string) => void;
};

// jQuery plugin extensions
interface JQuery {
    transition(options: any): JQuery;
    autocomplete(options: any): JQuery;
    sortable(options: any): JQuery;
}

// Window extensions
interface Window {
    acmPoppers: {
        Export: any;
        UI: any;
        UISub: any;
        UIPreset: any;
        Settings: any;
    };
    acmIsUpdatingDetails: boolean;
}

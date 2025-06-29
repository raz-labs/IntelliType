// Component-related type definitions

export interface ButtonProps {
    text: string;
    variant: 'primary' | 'secondary' | 'danger' | 'ghost';
    size: 'small' | 'medium' | 'large';
    disabled?: boolean;
    loading?: boolean;
    icon?: IconProps;
    onClick: (event: MouseEvent) => void;
}

export interface IconProps {
    name: string;
    size: number;
    color?: string;
    position?: 'left' | 'right';
}

export interface ModalProps {
    isOpen: boolean;
    title: string;
    content: string;
    footer?: string;
    size: 'small' | 'medium' | 'large' | 'fullscreen';
    closable?: boolean;
    onClose: () => void;
    backdrop?: {
        clickToClose: boolean;
        blur: boolean;
    };
}

export interface FormFieldProps {
    label: string;
    name: string;
    type: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select';
    value: any;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    validation?: ValidationRule[];
    onChange: (value: any) => void;
    onBlur?: () => void;
}

export interface ValidationRule {
    type: 'required' | 'email' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
    value?: any;
    message: string;
    validator?: (value: any) => boolean;
}

export interface TableProps<T = any> {
    data: T[];
    columns: TableColumn<T>[];
    pagination?: TablePagination;
    sorting?: TableSorting;
    selection?: TableSelection<T>;
    loading?: boolean;
    emptyState?: string;
}

export interface TableColumn<T> {
    key: keyof T;
    title: string;
    width?: number;
    sortable?: boolean;
    filterable?: boolean;
    render?: (value: any, record: T, index: number) => string;
}

export interface TablePagination {
    current: number;
    pageSize: number;
    total: number;
    showSizeChanger?: boolean;
    pageSizeOptions?: number[];
    onChange: (page: number, pageSize: number) => void;
}

export interface TableSorting {
    field: string;
    direction: 'asc' | 'desc';
    onChange: (field: string, direction: 'asc' | 'desc') => void;
}

export interface TableSelection<T> {
    selectedRows: T[];
    onSelectionChange: (selectedRows: T[]) => void;
    selectAll?: boolean;
} 
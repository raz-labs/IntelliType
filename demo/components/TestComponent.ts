// Test file to verify folder distance sorting

// This should prefer ButtonProps from the same folder over other matches
const myButton = {
    text: "Save",
    variant: "primary",
    size: "large",
    disabled: false,
    onClick: (event: MouseEvent) => console.log("saved")
};

// This should prefer local component types over distant ones
const localModal = {
    isOpen: true,
    title: "Confirmation",
    content: "Are you sure?",
    size: "medium",
    onClose: () => console.log("closed")
};

// Local interface in same file (should have highest priority)
interface LocalButtonConfig {
    text: string;
    variant: string;
    size: string;
    disabled: boolean;
    onClick: (event: MouseEvent) => void;
}

// This should prefer LocalButtonConfig (same file) over ButtonProps (same folder)
const anotherButton = {
    text: "Cancel",
    variant: "secondary", 
    size: "small",
    disabled: false,
    onClick: (event: MouseEvent) => console.log("cancelled")
}; 
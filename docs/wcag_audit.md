# WCAG 2.2 Compliance Audit for Wayfinder Kiosk

This document provides a high-level audit of the Wayfinder Kiosk application against the Web Content Accessibility Guidelines (WCAG) 2.2. The audit is based on a review of the application's source code.

## Summary

The application demonstrates a strong foundation for accessibility. Many key features, such as a dedicated accessibility toolbar, use of ARIA attributes, and i18n, are already implemented. The main areas for improvement are in ensuring the robustness of the high-contrast mode and verifying keyboard navigation paths.

## Principle 1: Perceivable

### 1.1 Text Alternatives
- **(A) Good:** Most images have appropriate alternative text. For example, POI images in the `Directory` component use the POI name for the `alt` text.
- **(A) Good:** Decorative images, like the logo in the `QRCodeModal`, correctly use an empty `alt` tag and `aria-hidden="true"`.
- **(B) Improvement:** Some SVGs used as icons lack text alternatives (e.g., the walking time badge in `Directory.tsx`). While the meaning might be clear from context, adding a `<title>` element within the SVG or an `aria-label` on the parent element would be more robust.

### 1.3 Adaptable
- **(A) Good:** The application uses semantic HTML elements like `<header>`, `<main>`, `<h1>`, and `<button>`, which helps create a logical structure.
- **(A) Good:** ARIA roles such as `role="dialog"`, `aria-modal="true"`, `role="region"`, and `role="alert"` are used correctly to define the purpose of different UI components.

### 1.4 Distinguishable
- **(A) Excellent:** The `AccessibilityToolbar` provides options for high contrast and large text, which is a major win for accessibility.
- **(B) Improvement:** The high-contrast mode is implemented using `filter: contrast(1.2)`. This is a quick solution but may not provide sufficient contrast for all users. A better approach would be to define a separate set of high-contrast colors that are applied when this mode is enabled. This would provide more control and ensure compliance with contrast ratio requirements.
- **(A) Excellent:** The large text mode increases the base font size to `125%`, which helps users with low vision.
- **(A) Good:** The application appears to use actual text rather than images of text, which is great for readability and screen readers.

## Principle 2: Operable

### 2.1 Keyboard Accessible
- **(A) Good:** The application heavily relies on `<button>` elements, which are natively keyboard-accessible.
- **(A) Good:** A `VirtualKeyboard` component is provided for text input, which is essential for a kiosk environment.
- **(C) To Verify:** The virtual keyboard itself should be navigable using a physical keyboard for users who may have one connected. Each key on the virtual keyboard should be a focusable element.

### 2.4 Navigable
- **(A) Excellent:** The application makes extensive use of focus rings (e.g., `focus:ring-4 focus:ring-blue-500`), which makes keyboard navigation much clearer.
- **(A) Good:** `aria-label` attributes are used to provide clear and descriptive names for buttons, especially in the `AccessibilityToolbar`.

## Principle 3: Understandable

### 3.1 Readable
- **(A) Good:** The application uses `react-i18next` for internationalization. The language of the UI can be changed, which is excellent for a diverse user base in an airport. It is assumed the `lang` attribute of the `<html>` element is updated dynamically.

### 3.3 Input Assistance
- **(A) Good:** The application provides helpful error messages (e.g., in the `GateFinder` component when a flight is not found).
- **(A) Good:** `aria-label` attributes are used on input fields and buttons to provide clear instructions.

## Principle 4: Robust

### 4.1 Compatible
- **(A) Excellent:** The use of ARIA attributes (`aria-pressed`, `aria-expanded`, `aria-modal`) is well-implemented throughout the application, ensuring that assistive technologies can understand the state of various components.
- **(A) Good:** The application is built with React, which generally produces well-formed HTML that can be reliably interpreted by browsers and screen readers.

## Recommendations

1.  **Improve High-Contrast Mode:** Replace the CSS `filter` with a dedicated high-contrast theme that uses a palette of colors with guaranteed sufficient contrast ratios.
2.  **Verify Virtual Keyboard Navigation:** Ensure that the `VirtualKeyboard` component can be operated with a physical keyboard.
3.  **Audit SVG Icons:** Review all SVG icons to ensure they have appropriate text alternatives if they convey information, or are hidden from assistive technologies if they are purely decorative.
4.  **Color Contrast Check:** Perform a full audit of the default color scheme using a color contrast checker to ensure all text meets WCAG AA or AAA requirements.

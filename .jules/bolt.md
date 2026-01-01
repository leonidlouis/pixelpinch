## 2024-05-23 - React.memo broken by inline functions
**Learning:** Passing inline arrow functions (e.g., `onRemove={() => handleRemove(id)}`) to a `React.memo` component breaks memoization because a new function reference is created on every render.
**Action:** Always pass the stable handler function directly (e.g., `onRemove={handleRemove}`) and pass the ID/data as an argument to the handler, or have the child component call the handler with its ID. In this case, `FileItem` should take `onRemove: (id: string) => void` or generic handler, or `FileItem` should call `onRemove(id)`.

# UI Package

Shared generic UI components built with shadcn/ui and Radix primitives.

## Features

- **shadcn/ui Components**: Pre-styled, accessible UI components
- **Radix Primitives**: Headless, accessible component foundations
- **Form Wrappers**: Generic react-hook-form field helpers
- **App State Components**: Loading, empty, and error states
- **Layout Helpers**: Reusable layout and media controls
- **Tailwind CSS**: Utility-first styling with CSS variables
- **Motion**: Framer Motion for animations

## Components

All components follow shadcn/ui patterns and are built on Radix primitives:

| Component | Description |
|-----------|-------------|
| `Accordion` | Expandable content sections |
| `AlertDialog` | Modal confirmation dialogs |
| `Alert` | Inline alert messages |
| `Avatar` | User profile images |
| `Badge` | Status indicators |
| `Button` | Primary action element |
| `Callout` | Tonal banner (info / warning / success / destructive) |
| `Card` | Content containers |
| `Checkbox` | Boolean inputs |
| `Command` | Command palette / search |
| `Dialog` | Modal overlays |
| `DropdownMenu` | Action menus |
| `EmptyState` | Empty-list illustration with title + action |
| `ErrorState` | Error block with icon, message, and retry |
| `Form` | Form components with react-hook-form |
| `Input` | Text inputs |
| `Label` | Form labels |
| `LoadingState` | Page or inline spinner + label |
| `Progress` | Progress indicators |
| `ScrollArea` | Custom scrollbars |
| `ScrubBar` | Generic scrub/progress controls for media timelines |
| `Select` | Dropdown selection |
| `Sheet` | Slide-out panels |
| `Sidebar` | Navigation sidebar |
| `Skeleton` | Loading placeholders |
| `Slider` | Range inputs |
| `Tabs` | Tabbed navigation |
| `Textarea` | Multi-line inputs |
| `Tooltip` | Hover information |
| `EditableText` | Inline editable text with pencil-on-hover affordance |
| `Suggestion` | Pill-shaped chip button for a single autocomplete suggestion |
| `Suggestions` | Horizontal scrollable row that wraps `Suggestion` chips |
| `ResizablePanelGroup` | Horizontal or vertical resizable panel container |
| `ResizablePanel` | Individual panel inside a `ResizablePanelGroup` |
| `ResizableHandle` | Drag handle between resizable panels (optional grip icon via `withHandle`) |

## Usage

### Import from Package Root

```typescript
import { Button, Card, Input, Dialog } from '@/packages/ui';

<Button variant="default" size="lg">
  Click me
</Button>
```

### Direct Component Imports

For specific components:

```typescript
import { Button } from '@/packages/ui/components/button';
import { Card, CardHeader, CardContent } from '@/packages/ui/components/card';
```

### Form Components

Forms integrate with react-hook-form:

```typescript
import { Form, FormField, FormItem, FormLabel, FormControl } from '@/packages/ui';
import { Input } from '@/packages/ui';
import { useForm } from 'react-hook-form';

function MyForm() {
  const form = useForm();

  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
          </FormItem>
        )}
      />
    </Form>
  );
}
```

## Styling

Components use Tailwind CSS with CSS variables for theming:

```css
/* Theme variables are defined in globals.css */
--background: 0 0% 100%;
--foreground: 0 0% 3.9%;
--primary: 0 0% 9%;
--primary-foreground: 0 0% 98%;
```

## Dependencies

- `@radix-ui/*` - Accessible primitives
- `class-variance-authority` - Variant styling
- `lucide-react` - Icons
- `framer-motion` - Animations
- `sonner` - Toast notifications
- `cmdk` - Command palette

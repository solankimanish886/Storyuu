import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import {
  Bold, Italic, Underline, List, ListOrdered, Link2, Link2Off,
  Heading1, Heading2, Heading3, Undo, Redo,
} from 'lucide-react';

interface Props {
  content: string;
  onChange: (html: string) => void;
  disabled?: boolean;
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`flex h-8 w-8 items-center justify-center rounded transition-colors ${
        active
          ? 'bg-brand-cyan/20 text-brand-cyan'
          : 'text-admin-text-secondary hover:bg-white/10 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({ content, onChange, disabled = false }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  function setLink() {
    const prev = editor!.getAttributes('link').href ?? '';
    const url = window.prompt('URL', prev);
    if (url === null) return;
    if (url === '') {
      editor!.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor!.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  }

  return (
    <div className="flex flex-col rounded-xl border border-white/10 overflow-hidden bg-[#0D0F17]">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-white/10 bg-[#12141D] px-3 py-2">
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1">
          <Heading1 size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
          <Heading2 size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">
          <Heading3 size={15} />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-white/10" />

        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
          <Bold size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
          <Italic size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
          <Underline size={15} />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-white/10" />

        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">
          <List size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list">
          <ListOrdered size={15} />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-white/10" />

        <ToolbarButton onClick={setLink} active={editor.isActive('link')} title="Add link">
          <Link2 size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().unsetLink().run()} active={false} title="Remove link">
          <Link2Off size={15} />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-white/10" />

        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} active={false} title="Undo">
          <Undo size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} active={false} title="Redo">
          <Redo size={15} />
        </ToolbarButton>
      </div>

      {/* Editor area */}
      <EditorContent
        editor={editor}
        className="prose prose-invert prose-sm max-w-none min-h-[260px] px-5 py-4 text-neutral-200 focus-within:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[240px]"
      />
    </div>
  );
}

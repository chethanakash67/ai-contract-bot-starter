import { Extension, type CommandProps } from '@tiptap/core';

export const FontSize = Extension.create({
  name: 'fontSize',
  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontSize: {
            default: null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
            parseHTML: (element) => ({ fontSize: (element as HTMLElement).style.fontSize || null }),
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (size?: string) =>
        ({ chain }: CommandProps) => {
          return chain().setMark('textStyle', { fontSize: size || null }).run();
        },
      unsetFontSize: () => ({ chain }: CommandProps) => chain().setMark('textStyle', { fontSize: null }).run(),
    } as any;
  },
});


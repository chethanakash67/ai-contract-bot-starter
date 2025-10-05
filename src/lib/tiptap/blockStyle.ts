import { Extension, type CommandProps } from '@tiptap/core';

// Applies fontFamily and fontSize styles at the block level (paragraph/headings)
export const BlockStyle = Extension.create({
  name: 'blockStyle',
  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading', 'listItem'],
        attributes: {
          fontFamily: {
            default: null,
            renderHTML: (attrs) => attrs.fontFamily ? { style: `font-family: ${attrs.fontFamily}` } : {},
            parseHTML: element => ({ fontFamily: (element as HTMLElement).style.fontFamily || null }),
          },
          fontSize: {
            default: null,
            renderHTML: (attrs) => attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
            parseHTML: element => ({ fontSize: (element as HTMLElement).style.fontSize || null }),
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setBlockFontFamily:
        (family?: string) =>
        ({ chain }: CommandProps) => {
          const v = family || null;
          return chain()
            .updateAttributes('paragraph', { fontFamily: v })
            .updateAttributes('heading', { fontFamily: v })
            .updateAttributes('listItem', { fontFamily: v })
            .run();
        },
      setBlockFontSize:
        (size?: string) =>
        ({ chain }: CommandProps) => {
          const v = size || null;
          return chain()
            .updateAttributes('paragraph', { fontSize: v })
            .updateAttributes('heading', { fontSize: v })
            .updateAttributes('listItem', { fontSize: v })
            .run();
        },
    } as any;
  },
});


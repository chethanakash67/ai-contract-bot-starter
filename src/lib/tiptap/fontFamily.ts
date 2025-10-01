import { Extension } from '@tiptap/core';

export const FontFamily = Extension.create({
  name: 'fontFamily',
  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontFamily: {
            default: null,
            renderHTML: (attributes) => {
              if (!attributes.fontFamily) return {};
              return { style: `font-family: ${attributes.fontFamily}` };
            },
            parseHTML: (element) => ({ fontFamily: element.style.fontFamily || null }),
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontFamily:
        (family?: string) =>
        ({ chain }) => chain().setMark('textStyle', { fontFamily: family || null }).run(),
      unsetFontFamily: () => ({ chain }) => chain().setMark('textStyle', { fontFamily: null }).run(),
    };
  },
});


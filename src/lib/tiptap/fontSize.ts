import { Extension } from '@tiptap/core';

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
            parseHTML: (element) => ({ fontSize: element.style.fontSize || null }),
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (size?: string) =>
        ({ chain }) => {
          return chain().setMark('textStyle', { fontSize: size || null }).run();
        },
      unsetFontSize: () => ({ chain }) => chain().setMark('textStyle', { fontSize: null }).run(),
    };
  },
});


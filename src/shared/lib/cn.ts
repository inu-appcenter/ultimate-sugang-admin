import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['metric', 'h1', 'h2', 'h3', 'body', 'caption'] }],
      rounded: [{ rounded: ['card', 'btn', 'modal'] }],
      shadow: [{ shadow: ['card', 'modal'] }],
      'max-w': [{ 'max-w': ['content', 'login-card', 'modal', 'modal-wide'] }],
      'min-w': [{ 'min-w': ['viewport'] }],
      h: [{ h: ['header'] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

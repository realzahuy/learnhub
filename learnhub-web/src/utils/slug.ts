
export const generateSlug = (title: string): string =>
  title
    .normalize('NFD')

    .replace(/[̀-ͯ]/g, '')

    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

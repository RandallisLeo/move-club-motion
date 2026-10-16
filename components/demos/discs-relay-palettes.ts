type RelayPalette = { id: string; name: string; note: string; swatches: readonly string[]; colors: readonly string[] };
export const RELAY_DEFAULT_PALETTE = 'rose';
function palette(id: string, name: string, note: string, swatches: readonly string[], order: readonly number[]): RelayPalette {
  return { id, name, note, swatches, colors: order.map(i => swatches[i]) };
}

export const RELAY_PALETTES: readonly RelayPalette[] = [
  palette('cool', 'Cool spectrum', '冰青 · 湖蓝 · 紫罗兰 · 莓粉',
    ['#93cfd6', '#50bdcb', '#4b9cd4', '#7886da', '#aa7acb', '#d477ad'],
    [1, 3, 0, 2, 1, 5, 0, 4, 5, 4, 2, 3]),
  palette('rose', 'Rose / Amber', '蜜黄 · 杏橙 · 珊瑚 · 玫瑰 · 莓紫',
    ['#efc65b', '#e99a61', '#e67577', '#d470a6', '#9a79bc'],
    [0, 3, 1, 4, 2, 0, 3, 1, 2, 0, 4, 2]),
  palette('sea', 'Sea glass', '浅青 · 湖蓝 · 翡翠 · 青柠 · 浅金',
    ['#4bbdce', '#3f9dce', '#59b7a1', '#b9cc69', '#e5d77b'],
    [0, 3, 1, 4, 2, 0, 3, 1, 2, 0, 4, 2]),
  palette('color', 'Color spectrum', '珊瑚 · 杏橙 · 金黄 · 绿 · 青 · 蓝 · 紫',
    ['#ea626e', '#eaa460', '#ebcf65', '#6fbd8a', '#5fc3c9', '#559bdd', '#9c82d8'],
    [0, 3, 1, 4, 2, 5, 6, 0, 2, 6, 1, 4]),
];

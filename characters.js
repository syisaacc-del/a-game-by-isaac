export const CHARACTERS = [
  {
    id: 'hayato',
    name: '隼人',
    nation: '日本',
    flag: '🇯🇵',
    talent: '極速',
    talentDesc: '移動速度 +55%',
    speedMul: 1.55,
    maxHp: 100,
    damageReduction: 0,
    extraChain: 0,
    shootCdMul: 1,
    colors: {
      skin: '#f5d0b0', body: '#1a1a2e', bodyLight: '#2d2d44',
      accent: '#e63946', hair: '#1a1a1a', gun: '#444', trim: '#ff4757',
    },
  },
  {
    id: 'viktor',
    name: 'Viktor',
    nation: '俄羅斯',
    flag: '🇷🇺',
    talent: '鐵壁',
    talentDesc: 'HP +60，受傷 -20%',
    speedMul: 1,
    maxHp: 160,
    damageReduction: 0.2,
    extraChain: 0,
    shootCdMul: 1,
    colors: {
      skin: '#e8c4a8', body: '#3d4f5f', bodyLight: '#5a6f7f',
      accent: '#90a4ae', hair: '#4a3728', gun: '#555', trim: '#cfd8dc',
    },
  },
  {
    id: 'zara',
    name: 'Zara',
    nation: '埃及',
    flag: '🇪🇬',
    talent: '雷電',
    talentDesc: '子彈額外連鎖 +1 次',
    speedMul: 1,
    maxHp: 100,
    damageReduction: 0,
    extraChain: 1,
    shootCdMul: 0.9,
    colors: {
      skin: '#c68642', body: '#b8860b', bodyLight: '#daa520',
      accent: '#00e5ff', hair: '#111', gun: '#333', trim: '#ffd700',
    },
  },
];

export function getCharacter(id) {
  return CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
}

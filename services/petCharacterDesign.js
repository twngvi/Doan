/**
 * petCharacterDesign.js
 *
 * Shared visual design definitions for the 3D capybara character system.
 * This is a pure config + prompt utility layer for frontend/admin tooling.
 */

const PET_3D_CHARACTER_STYLE = {
  visualCore:
    "3D cartoon soft capybara character, premium mobile casual style, round and chubby stylized form, big head small body ratio around 60 over 40, tiny legs, pastel brown and caramel-beige colors, smooth clean shading, no hard outlines",
  lighting:
    "key light from upper-left, gentle rear rim light, soft blurred ground shadow, subtle surrounding glow",
  composition:
    "character centered, simple gradient background (soft green or warm yellow), no complex background",
  idleAnimation:
    "gentle squash-stretch scale 0.97 to 1 loop, blink every 3-4 seconds, subtle chill sway with occasional still sitting",
  identityRule:
    "keep same capybara identity across all evolution stages via silhouette, small oval eyes, muzzle, and calm expression",
  negativePrompt:
    "realistic, detailed fur, dark lighting, horror style, sharp edges, complex background, aggressive, messy, human-like, low quality",
};

const PET_3D_STAGE_DEFINITIONS = [
  {
    index: 1,
    key: "energy_seed",
    label: "Giai doan 1 - Hat nang luong",
    minLevel: 0,
    stagePrompt:
      "small rounded pastel-brown energy blob, soft inner glow, pulse flicker, gentle wobble",
  },
  {
    index: 2,
    key: "baby_capybara",
    label: "Giai doan 2 - Baby capybara",
    minLevel: 1,
    stagePrompt:
      "very small super-round baby capybara, tiny ears, tiny bright oval eyes, low lazy sitting pose",
  },
  {
    index: 3,
    key: "young_capybara",
    label: "Giai doan 3 - Capybara con",
    minLevel: 4,
    stagePrompt:
      "about 1.3x bigger capybara child form, clearer muzzle, visible small legs, richer shading, subtle blush",
  },
  {
    index: 4,
    key: "teen_capybara",
    label: "Giai doan 4 - Capybara thieu nien",
    minLevel: 8,
    stagePrompt:
      "longer balanced body, smoother fur shading, light accessories like scarf, fruit hat, or towel, clear chill relax pose",
  },
  {
    index: 5,
    key: "adult_capybara",
    label: "Giai doan 5 - Capybara truong thanh",
    minLevel: 15,
    stagePrompt:
      "fully polished adult capybara, smooth highlights, subtle aura, king-of-chill sitting pose, optional steam and tiny sparkles",
  },
];

const PET_3D_GENDER_DEFINITIONS = {
  male: {
    key: "male",
    label: "Capybara duc",
    genderPrompt:
      "slightly squarer body form, deeper caramel-brown tone, accessory like scarf, fruit, or tiny glasses, slow cool movement",
  },
  female: {
    key: "female",
    label: "Capybara cai",
    genderPrompt:
      "rounder softer form, brighter beige pastel tone, accessory like bow, necklace, or flower, gentle cute movement",
  },
  neutral: {
    key: "neutral",
    label: "Neutral",
    genderPrompt: "gender-neutral capybara variation preserving calm identity",
  },
};

const PET_3D_STATE_DEFINITIONS = {
  happy: {
    key: "happy",
    label: "Vui",
    statePrompt: "eyes brighter and a bit wider, gentle body bounce, slight glow boost",
  },
  hungry: {
    key: "hungry",
    label: "Doi",
    statePrompt: "droopy sleepy eyes, slightly flattened body, lighter desaturated tone",
  },
  clean: {
    key: "clean",
    label: "Sach",
    statePrompt: "sparkles around body, glossier fur, subtle water reflection",
  },
  dirty: {
    key: "dirty",
    label: "Ban",
    statePrompt: "light dirt marks, duller color, no visible glow",
  },
};

function resolvePet3DStageByLevel(level, isHatched) {
  if (!isHatched) {
    return PET_3D_STAGE_DEFINITIONS[0];
  }

  const currentLevel = Math.max(1, parseInt(level, 10) || 1);
  if (currentLevel >= 15) return PET_3D_STAGE_DEFINITIONS[4];
  if (currentLevel >= 8) return PET_3D_STAGE_DEFINITIONS[3];
  if (currentLevel >= 4) return PET_3D_STAGE_DEFINITIONS[2];
  return PET_3D_STAGE_DEFINITIONS[1];
}

function resolvePet3DGenderForStage(gender, stageIndex) {
  if (stageIndex < 4) {
    return PET_3D_GENDER_DEFINITIONS.neutral;
  }

  const key = String(gender || "").toLowerCase();
  if (key === "male") return PET_3D_GENDER_DEFINITIONS.male;
  return PET_3D_GENDER_DEFINITIONS.female;
}

function resolvePet3DState(stateKey) {
  const key = String(stateKey || "").toLowerCase();
  return PET_3D_STATE_DEFINITIONS[key] || PET_3D_STATE_DEFINITIONS.happy;
}

function buildPet3DCharacterPrompt(input) {
  const payload = input || {};
  const stage = resolvePet3DStageByLevel(payload.levelCurrent, !!payload.isHatched);
  const gender = resolvePet3DGenderForStage(payload.gender, stage.index);
  const mood = resolvePet3DState(payload.state);

  return [
    PET_3D_CHARACTER_STYLE.visualCore,
    PET_3D_CHARACTER_STYLE.identityRule,
    "Stage: " + stage.stagePrompt,
    "Gender: " + gender.genderPrompt,
    "State: " + mood.statePrompt,
    "Lighting: " + PET_3D_CHARACTER_STYLE.lighting,
    "Idle animation: " + PET_3D_CHARACTER_STYLE.idleAnimation,
    "Composition: " + PET_3D_CHARACTER_STYLE.composition,
    "Negative prompt: " + PET_3D_CHARACTER_STYLE.negativePrompt,
  ].join(". ");
}

function getPet3DCharacterSystemDefinition() {
  return {
    style: PET_3D_CHARACTER_STYLE,
    stages: PET_3D_STAGE_DEFINITIONS,
    genders: PET_3D_GENDER_DEFINITIONS,
    states: PET_3D_STATE_DEFINITIONS,
  };
}

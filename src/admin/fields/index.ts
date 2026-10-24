// Inspector fields per editor section.
import { colorFields } from "./colors.ts";
import { fontFields } from "./fonts.ts";
import { iconFields } from "./icons.ts";
import { logoFields } from "./logos.ts";
import { photoFields } from "./photos.ts";
import { ruleFields } from "./rules.ts";
import { templateFields } from "./templates.ts";
import { commonFields, type FieldDef } from "./types.ts";

export const FIELDS: Record<string, FieldDef[]> = {
  logos: [...logoFields, ...commonFields({ rules: true })],
  colors: [...colorFields, ...commonFields({ rules: true, help: false })],
  fonts: [...fontFields, ...commonFields({ rules: true })],
  icons: [...iconFields, ...commonFields({ rules: true })],
  photos: [...photoFields, ...commonFields({ rules: true })],
  templates: [...templateFields, ...commonFields({ rules: true })],
  rules: [...ruleFields, ...commonFields({ rules: false })],
};

// onboarding.json (spec section 14): the New to the team steps, in order. Each step links to the hub: an asset or
// a module page. Link text comes from the asset's or module's label, so the data holds no link copy.
import { z } from "zod";
import { id, oneLine } from "./asset.ts";
import { MODULE_IDS } from "./hub-config.ts";

export const onboardingLink = z.union([z.strictObject({ asset: id }), z.strictObject({ module: z.enum(MODULE_IDS) })]);

export const onboardingStep = z.strictObject({
  id,
  title: oneLine,
  /** One paragraph, plain text. */
  body: z.string().min(1).optional(),
  links: z.array(onboardingLink).min(1),
});

export const onboarding = z.strictObject({
  $schema: z.string().optional(),
  steps: z
    .array(onboardingStep)
    .min(1)
    .refine((s) => new Set(s.map((x) => x.id)).size === s.length, { message: "step ids must be unique" }),
});

export type OnboardingLink = z.infer<typeof onboardingLink>;
export type OnboardingStep = z.infer<typeof onboardingStep>;
export type Onboarding = z.infer<typeof onboarding>;

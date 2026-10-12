"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  Building2Icon,
  CheckIcon,
  ImagesIcon,
  ListChecksIcon,
  MailIcon,
  SparklesIcon,
  VideoIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

import { ImagePickerField } from "@/components/media/image-picker-field";
import { VideoPickerField } from "@/components/media/video-picker-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SectionStyle } from "@/db/schema";
import { cn } from "@/lib/utils";
import type { SiteContext } from "@/sections/components";
import { type Field } from "@/sections/fields";
import { ITEM_DEFS } from "@/sections/items";
import type { CustomLayout } from "@/sections/layout";
import { buildPreset, type GuideSlots, GOALS, PRESETS } from "@/sections/presets";
import { newSectionBlock, type SectionBlock } from "@/sections/registry";
import { SectionView, themeProps, ThemeFonts } from "@/sections/site-page";
import type { SiteTheme } from "@/sections/theme";

import { BackgroundPicker } from "./background-picker";
import { getIn, type Path, setIn } from "./doc-ops";
import { useEditorMeta } from "./editor-meta";
import { FieldInput } from "./field-input";

const GOAL_ICONS = {
  sparkles: SparklesIcon,
  building: Building2Icon,
  images: ImagesIcon,
  video: VideoIcon,
  list: ListChecksIcon,
  mail: MailIcon,
};

const STEPS = ["Goal", "Design", "Content", "Background"] as const;

type FillStep = {
  id: string;
  title: string;
  hint: string;
  /** Where the value lives in the block ("data" path), or the backdrop. */
  render: (block: SectionBlock, update: (next: SectionBlock) => void) => React.ReactNode;
};

/** Finds an item's path inside the layout by id. */
function itemDataPath(layout: CustomLayout, itemId: string): Path | null {
  for (const [r, row] of layout.rows.entries()) {
    for (const [c, column] of row.columns.entries()) {
      const i = column.items.findIndex((item) => item.id === itemId);
      if (i !== -1) return ["layout", "rows", r, "columns", c, "items", i, "data"];
    }
  }
  return null;
}

function fieldStep(
  id: string,
  title: string,
  hint: string,
  itemId: string,
  key: string,
  field: Field,
): FillStep {
  return {
    id,
    title,
    hint,
    render: (block, update) => {
      const path = itemDataPath(block.data.layout as CustomLayout, itemId);
      if (!path) return null;
      return (
        <FieldInput
          field={{ ...field, label: title, help: undefined }}
          value={getIn(block.data, [...path, key])}
          onChange={(value) => update({ ...block, data: setIn(block.data, [...path, key], value) })}
        />
      );
    },
  };
}

/** The guided questions for a design (requirement SB-3), in order. */
function fillSteps(slots: GuideSlots, siteId: string): FillStep[] {
  const steps: FillStep[] = [];
  if (slots.headline) {
    steps.push(
      fieldStep(
        "headline",
        "Your headline",
        "What's the one thing visitors should know? For example: “Fresh pasta, made every morning”.",
        slots.headline,
        "text",
        ITEM_DEFS.heading.fields.text,
      ),
    );
  }
  if (slots.text) {
    steps.push(
      fieldStep(
        "text",
        "A line or two of text",
        "Who is it for, and why will they love it? Short sentences read best.",
        slots.text,
        "body",
        ITEM_DEFS.text.fields.body,
      ),
    );
  }
  if (slots.buttons) {
    steps.push(
      fieldStep(
        "button",
        "Your main button",
        "What should visitors do next? For example “Book a table”, going to your Contact page.",
        slots.buttons,
        "primary",
        ITEM_DEFS.buttons.fields.primary,
      ),
    );
  }
  if (slots.media === "backdrop") {
    const video = slots.mediaKind === "video";
    steps.push({
      id: "media",
      title: video ? "Your background video" : "Your background photo",
      hint: video
        ? "A short, calm clip works best. It plays silently on a loop; phones show a still image."
        : "A wide photo works best. You'll be able to choose the part that must stay visible.",
      render: (block, update) => {
        const backdrop = block.style.backdrop;
        if (backdrop?.kind === "video") {
          return (
            <VideoPickerField
              id="guide-video"
              siteId={siteId}
              label="Background video"
              value={{ src: backdrop.src, poster: backdrop.poster, alt: "" }}
              onChange={(value) =>
                update({
                  ...block,
                  style: {
                    ...block.style,
                    backdrop: { ...backdrop, src: value.src, poster: value.poster },
                  },
                })
              }
            />
          );
        }
        if (backdrop?.kind === "image") {
          return (
            <ImagePickerField
              id="guide-image"
              siteId={siteId}
              label="Background photo"
              withAlt={false}
              value={{ src: backdrop.src, alt: "" }}
              onChange={(value) =>
                update({
                  ...block,
                  style: { ...block.style, backdrop: { ...backdrop, src: value.src } },
                })
              }
            />
          );
        }
        return null;
      },
    });
  } else if (slots.media && slots.mediaKind) {
    const config = {
      image: {
        key: "image",
        field: ITEM_DEFS.image.fields.image,
        title: "Your photo",
        hint: "Choose a photo, or upload one from your computer.",
      },
      video: {
        key: "video",
        field: ITEM_DEFS.video.fields.video,
        title: "Your video",
        hint: "Upload a video. You can also paste a YouTube link later in the settings.",
      },
      logos: {
        key: "logos",
        field: ITEM_DEFS.logos.fields.logos,
        title: "Your client logos",
        hint: "Add each company's name and logo. Five or more make the carousel move.",
      },
      slides: {
        key: "slides",
        field: ITEM_DEFS.slider.fields.slides,
        title: "Your photos",
        hint: "Add a photo and an optional caption for each slide.",
      },
    }[slots.mediaKind];
    steps.push(
      fieldStep("media", config.title, config.hint, slots.media, config.key, config.field),
    );
  }
  return steps;
}

/** A scaled-down, real render of the section being built. */
function Preview({
  block,
  site,
  theme,
  width = 1100,
  scale = 0.36,
}: {
  block: SectionBlock;
  site: SiteContext;
  theme: SiteTheme;
  width?: number;
  scale?: number;
}) {
  return (
    <div
      className="pointer-events-none overflow-hidden rounded-lg border bg-white"
      aria-hidden
      inert
    >
      <div
        {...themeProps(theme)}
        className="sq-site"
        style={{ ...themeProps(theme).style, width, zoom: scale }}
      >
        <ThemeFonts theme={theme} />
        <SectionView block={block} site={site} />
      </div>
    </div>
  );
}

export type BuildResult = { block: SectionBlock; complete: boolean };

/**
 * "Build your own" (requirements SB-1 to SB-5): pick a goal and a starting design, answer a few
 * questions, choose a background. Leaving part-way still adds what was filled in.
 */
export function BuildSectionDialog({
  open,
  onOpenChange,
  site,
  theme,
  onBuilt,
  onPickSection,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site: SiteContext;
  theme: SiteTheme;
  onBuilt: (result: BuildResult) => void;
  /** A goal that's served by an existing section type (e.g. the contact form). */
  onPickSection: (type: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        {open && (
          <Journey
            site={site}
            theme={theme}
            onClose={() => onOpenChange(false)}
            onBuilt={onBuilt}
            onPickSection={onPickSection}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Journey({
  site,
  theme,
  onClose,
  onBuilt,
  onPickSection,
}: {
  site: SiteContext;
  theme: SiteTheme;
  onClose: () => void;
  onBuilt: (result: BuildResult) => void;
  onPickSection: (type: string) => void;
}) {
  const meta = useEditorMeta();
  const [goalId, setGoalId] = useState<string | null>(null);
  const [built, setBuilt] = useState<{ block: SectionBlock; slots: GuideSlots } | null>(null);
  const [fillIndex, setFillIndex] = useState(0);
  const [stage, setStage] = useState<"goal" | "design" | "content" | "background">("goal");

  const goal = GOALS.find((item) => item.id === goalId);
  const steps = useMemo(
    () => (built ? fillSteps(built.slots, meta.site.id) : []),
    [built, meta.site.id],
  );
  const previews = useMemo(
    () =>
      Object.fromEntries(
        (goal?.presets ?? [])
          .filter((id) => PRESETS[id])
          .map((id) => {
            const preset = buildPreset(id)!;
            const block = newSectionBlock("custom");
            return [id, { ...block, data: { layout: preset.layout }, style: preset.style }];
          }),
      ) as Record<string, SectionBlock>,
    [goal],
  );

  function chooseDesign(id: string) {
    if (id.startsWith("section:")) {
      onPickSection(id.slice("section:".length));
      onClose();
      return;
    }
    const preset = buildPreset(id);
    if (!preset) return;
    const block = newSectionBlock("custom");
    setBuilt({
      block: { ...block, data: { layout: preset.layout }, style: preset.style },
      slots: preset.slots,
    });
    setFillIndex(0);
    setStage("content");
  }

  const update = (block: SectionBlock) => setBuilt((current) => current && { ...current, block });
  const finish = (complete: boolean) => {
    if (built) onBuilt({ block: built.block, complete });
    onClose();
  };

  const stageIndex = STEPS.findIndex((step) => step.toLowerCase() === stage);
  const step = steps[fillIndex];

  return (
    <div
      className="grid gap-5"
      // Leaving part-way keeps what's been filled in (SB-5).
      onKeyDown={(event) => {
        if (event.key === "Escape" && built) {
          event.preventDefault();
          finish(false);
        }
      }}
    >
      <DialogHeader>
        <DialogTitle>Build your own section</DialogTitle>
        <DialogDescription>
          {stage === "goal" && "What do you want this section to do?"}
          {stage === "design" && "Pick a starting design. Everything can be changed afterwards."}
          {stage === "content" && "A few quick questions. Skip any you're not sure about."}
          {stage === "background" && "Choose a background, or keep it plain."}
        </DialogDescription>
      </DialogHeader>

      <ol aria-label="Steps" className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {STEPS.map((label, index) => (
          <li
            key={label}
            aria-current={index === stageIndex ? "step" : undefined}
            className={cn(
              "flex items-center gap-1.5",
              index === stageIndex ? "font-medium" : "text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-full border text-xs",
                index < stageIndex && "border-primary bg-primary text-primary-foreground",
                index === stageIndex && "border-primary text-primary",
              )}
            >
              {index < stageIndex ? <CheckIcon className="size-3" aria-hidden /> : index + 1}
            </span>
            {label}
          </li>
        ))}
      </ol>

      {stage === "goal" && (
        <div
          role="radiogroup"
          aria-label="Goal"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {GOALS.map((item) => {
            const Icon = GOAL_ICONS[item.icon];
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={goalId === item.id}
                onClick={() => {
                  setGoalId(item.id);
                  setStage("design");
                }}
                className="grid gap-2 rounded-xl border p-4 text-left transition-colors hover:border-primary hover:bg-muted/50 aria-checked:border-primary"
              >
                <Icon className="size-5 text-primary" aria-hidden />
                <span className="font-medium">{item.label}</span>
                <span className="text-sm text-muted-foreground">{item.description}</span>
              </button>
            );
          })}
        </div>
      )}

      {stage === "design" && goal && (
        <ul aria-label="Starting designs" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goal.presets.map((id) => {
            if (id.startsWith("section:")) {
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => chooseDesign(id)}
                    className="grid h-full w-full content-start gap-2 rounded-xl border p-4 text-left hover:border-primary hover:bg-muted/50"
                  >
                    <MailIcon className="size-5 text-primary" aria-hidden />
                    <span className="font-medium">Contact form</span>
                    <span className="text-sm text-muted-foreground">
                      Name, email and message fields. You can change them afterwards.
                    </span>
                  </button>
                </li>
              );
            }
            const preset = PRESETS[id]!;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => chooseDesign(id)}
                  className="grid w-full gap-2 rounded-xl border p-2 text-left hover:border-primary hover:bg-muted/50"
                >
                  <Preview
                    block={previews[id]!}
                    site={site}
                    theme={theme}
                    width={1100}
                    scale={0.24}
                  />
                  <span className="px-1">
                    <span className="block font-medium">{preset.name}</span>
                    <span className="block text-sm text-muted-foreground">
                      {preset.description}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {(stage === "content" || stage === "background") && built && (
        <div className="grid gap-6 md:grid-cols-[1fr_1.1fr]">
          <div className="grid content-start gap-4">
            {stage === "content" && step && (
              <>
                <p className="text-xs font-medium text-muted-foreground">
                  Question {fillIndex + 1} of {steps.length}
                </p>
                <p className="text-sm text-muted-foreground">{step.hint}</p>
                <div key={step.id}>{step.render(built.block, update)}</div>
              </>
            )}
            {stage === "content" && !step && (
              <p className="text-sm text-muted-foreground">
                This design is ready to go. You can change every part of it in the settings panel.
              </p>
            )}
            {stage === "background" && (
              <BackgroundPicker
                style={built.block.style}
                siteId={meta.site.id}
                primary={theme.primary}
                chrome={false}
                onChange={(patch: Partial<SectionStyle>) =>
                  update({ ...built.block, style: { ...built.block.style, ...patch } })
                }
              />
            )}
          </div>
          <div className="grid content-start gap-2">
            <p className="text-xs font-medium text-muted-foreground">Preview</p>
            <Preview block={built.block} site={site} theme={theme} width={1100} scale={0.4} />
          </div>
        </div>
      )}

      <DialogFooter className="sm:justify-between">
        <div>
          {stage === "design" && (
            <Button variant="ghost" onClick={() => setStage("goal")}>
              <ArrowLeftIcon aria-hidden />
              Back
            </Button>
          )}
          {stage === "content" && (
            <Button
              variant="ghost"
              onClick={() => (fillIndex > 0 ? setFillIndex(fillIndex - 1) : setStage("design"))}
            >
              <ArrowLeftIcon aria-hidden />
              Back
            </Button>
          )}
          {stage === "background" && (
            <Button variant="ghost" onClick={() => setStage("content")}>
              <ArrowLeftIcon aria-hidden />
              Back
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {built && stage !== "background" && (
            <Button variant="outline" onClick={() => finish(false)}>
              Skip the rest and add it
            </Button>
          )}
          {stage === "content" && (
            <Button
              onClick={() =>
                fillIndex < steps.length - 1 ? setFillIndex(fillIndex + 1) : setStage("background")
              }
            >
              {step && fillIndex < steps.length - 1 ? "Next question" : "Next: background"}
              <ArrowRightIcon aria-hidden />
            </Button>
          )}
          {stage === "background" && (
            <Button onClick={() => finish(true)}>
              <CheckIcon aria-hidden />
              Add section
            </Button>
          )}
        </div>
      </DialogFooter>
    </div>
  );
}

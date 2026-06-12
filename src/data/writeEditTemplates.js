import {
  BadgeCheck,
  BriefcaseBusiness,
  ClipboardList,
  FileCheck2,
  FileSearch,
  GraduationCap,
  Languages,
  Mail,
  PenLine,
  Sparkles,
} from "lucide-react";

import { WRITE_EDIT_ARTWORK_COLORS } from "@/theme/colors";

// Shared source of truth for Write/Edit templates. Desktop and mobile may only
// adapt layout; titles, prompts, upload options, and workflow metadata stay here.
export const WRITE_EDIT_UPLOAD_OPTIONS = [
  { id: "upload_file", label: "Upload from Files", accepts: "document" },
  { id: "upload_image", label: "Upload from Gallery", accepts: "image" },
  { id: "take_photo", label: "Take Photo", accepts: "camera" },
  { id: "continue", label: "Continue without attachment", accepts: "none" },
];

export const WRITE_EDIT_SECTIONS = [
  {
    id: "writing",
    title: "Writing",
    icon: PenLine,
    items: [
      {
        id: "email-writer",
        title: "Email Writer",
        description: "Draft a polished message with the right tone.",
        prompt: "Write a professional email about ",
      },
      {
        id: "cv-builder",
        title: "CV Builder",
        description: "Shape experience into a clean professional CV.",
        prompt: "Build a professional CV for ",
      },
      {
        id: "cover-letter",
        title: "Cover Letter",
        description: "Draft a tailored cover letter for a role.",
        prompt: "Write a cover letter for ",
      },
      {
        id: "blog-post",
        title: "Blog Post",
        description: "Start a structured long-form post.",
        prompt: "Write a blog post about ",
      },
      {
        id: "social-media-post",
        title: "Social Media Post",
        description: "Create posts for social platforms.",
        prompt: "Create a social media post about ",
      },
      {
        id: "product-description",
        title: "Product Description",
        description: "Describe a product clearly and persuasively.",
        prompt: "Write a product description for ",
      },
      {
        id: "business-proposal",
        title: "Business Proposal",
        description: "Build a clear proposal with strong structure.",
        prompt: "Create a business proposal for ",
      },
    ],
  },
  {
    id: "edit-improve",
    title: "Edit & Improve",
    icon: Sparkles,
    items: [
      {
        id: "rewrite-document",
        title: "Rewrite Document",
        description: "Rewrite content for a specific tone or goal.",
        prompt: "Rewrite this document to make it ",
        supportsFiles: true,
      },
      {
        id: "fix-grammar",
        title: "Fix Grammar",
        description: "Correct grammar, spelling, and punctuation.",
        prompt: "Correct the grammar and spelling in ",
        supportsFiles: true,
      },
      {
        id: "make-professional",
        title: "Make Professional",
        description: "Make content polished and business-ready.",
        prompt: "Make this content more professional",
        supportsFiles: true,
      },
      {
        id: "make-friendly",
        title: "Make Friendly",
        description: "Make content warmer and more natural.",
        prompt: "Make this content more friendly and natural",
        supportsFiles: true,
      },
      {
        id: "shorten-text",
        title: "Shorten Text",
        description: "Condense content without losing meaning.",
        prompt: "Shorten this content while keeping the meaning",
        supportsFiles: true,
      },
      {
        id: "expand-text",
        title: "Expand Text",
        description: "Add helpful detail and structure.",
        prompt: "Expand this content with more detail",
        supportsFiles: true,
      },
      {
        id: "translate-document",
        title: "Translate Document",
        description: "Translate text or an attached document.",
        prompt: "Translate this document into ",
        supportsFiles: true,
      },
      {
        id: "summarize-document",
        title: "Summarize Document",
        description: "Summarize content with a chosen focus.",
        prompt: "Summarize this document and focus on ",
        supportsFiles: true,
      },
    ],
  },
  {
    id: "study-learning",
    title: "Study & Learning",
    icon: GraduationCap,
    items: [
      {
        id: "essay-writer",
        title: "Essay Writer",
        description: "Create structured essays and school reports.",
        prompt: "Write a structured essay about ",
      },
      {
        id: "homework-assistant",
        title: "Homework Assistant",
        description: "Get step-by-step study help.",
        prompt: "Help me solve and understand ",
      },
      {
        id: "school-report",
        title: "School Report",
        description: "Create a structured school report.",
        prompt: "Create a school report about ",
      },
      {
        id: "research-notes",
        title: "Research Notes",
        description: "Organize research into clear notes.",
        prompt: "Turn this research into organized notes about ",
      },
      {
        id: "flashcards-generator",
        title: "Flashcards Generator",
        description: "Turn material into study cards.",
        prompt: "Create study flashcards for ",
      },
      {
        id: "study-planner",
        title: "Study Planner",
        description: "Plan study sessions and deadlines.",
        prompt: "Create a study plan for ",
      },
    ],
  },
  {
    id: "career",
    title: "Career",
    icon: BriefcaseBusiness,
    items: [
      {
        id: "cv-improvement",
        title: "CV Improvement",
        description: "Improve structure, wording, and impact.",
        prompt: "Improve this CV and focus on ",
        supportsFiles: true,
      },
      {
        id: "cover-letter-generator",
        title: "Cover Letter Generator",
        description: "Generate a job-specific cover letter.",
        prompt: "Generate a cover letter for ",
      },
      {
        id: "linkedin-profile-writer",
        title: "LinkedIn Profile Writer",
        description: "Improve headline, about, and experience.",
        prompt: "Improve my LinkedIn profile for ",
      },
      {
        id: "job-application-assistant",
        title: "Job Application Assistant",
        description: "Prepare job application materials.",
        prompt: "Help me prepare a job application for ",
      },
    ],
  },
];

export const QUICK_WRITE_TEMPLATES = [
  {
    id: "email-writer",
    title: "Email Writer",
    description: "Draft a polished message with the right tone.",
    icon: Mail,
    prompt: "Write a professional email about ",
    artwork: WRITE_EDIT_ARTWORK_COLORS.writing,
  },
  {
    id: "cv-builder",
    title: "CV Builder",
    description: "Shape experience into a clean professional CV.",
    icon: FileCheck2,
    prompt: "Build a professional CV for ",
    artwork: WRITE_EDIT_ARTWORK_COLORS.careerBlue,
  },
  {
    id: "essay-writer",
    title: "Essay Writer",
    description: "Create structured essays and school reports.",
    icon: GraduationCap,
    prompt: "Write a structured essay about ",
    artwork: WRITE_EDIT_ARTWORK_COLORS.study,
  },
  {
    id: "business-proposal",
    title: "Business Proposal",
    description: "Build a clear proposal with strong structure.",
    icon: BriefcaseBusiness,
    prompt: "Create a business proposal for ",
    artwork: WRITE_EDIT_ARTWORK_COLORS.business,
  },
  {
    id: "cover-letter",
    title: "Cover Letter",
    description: "Draft a tailored cover letter for a role.",
    icon: PenLine,
    prompt: "Write a cover letter for ",
    artwork: WRITE_EDIT_ARTWORK_COLORS.careerPurple,
  },
  {
    id: "social-media-post",
    title: "Social Media Post",
    description: "Create posts for social platforms.",
    icon: BadgeCheck,
    prompt: "Create a social media post about ",
    artwork: WRITE_EDIT_ARTWORK_COLORS.social,
  },
  {
    id: "product-description",
    title: "Product Description",
    description: "Describe products clearly and persuasively.",
    icon: ClipboardList,
    prompt: "Write a product description for ",
    artwork: WRITE_EDIT_ARTWORK_COLORS.product,
  },
];

export const WRITE_UPLOAD_ACTIONS = [
  {
    id: "summarize-document",
    title: "Summarize Document",
    icon: FileSearch,
    prompt: "Summarize this document and focus on ",
  },
  {
    id: "rewrite-document",
    title: "Rewrite Document",
    icon: PenLine,
    prompt: "Rewrite this document to make it ",
  },
  {
    id: "translate-document",
    title: "Translate Document",
    icon: Languages,
    prompt: "Translate this document into ",
  },
  {
    id: "fix-grammar",
    title: "Fix Grammar",
    icon: Sparkles,
    prompt: "Correct the grammar and spelling in ",
  },
  {
    id: "cv-improvement",
    title: "CV Improvement",
    icon: BriefcaseBusiness,
    prompt: "Improve this CV and focus on ",
  },
];

export function getWriteEditTemplateById(templateId) {
  return WRITE_EDIT_SECTIONS
    .flatMap((section) => section.items)
    .find((template) => template.id === templateId) || null;
}

export function createWriteEditTask(template) {
  if (!template) return null;

  return {
    id: template.id,
    title: template.title,
    prompt: template.prompt,
  };
}

export function getWriteEditAttachmentLabel(attachment) {
  if (!attachment) return "";
  return attachment.name || attachment.fileName || attachment.title || "Attachment";
}

export function buildWriteEditMessage(prompt, attachments = []) {
  const cleanPrompt = String(prompt || "").trim();
  const usableAttachments = attachments.filter(Boolean);

  if (!usableAttachments.length) {
    return cleanPrompt;
  }

  const attachmentContext = usableAttachments.map((attachment, index) => {
    const label = getWriteEditAttachmentLabel(attachment);
    const heading = `Attachment ${index + 1}: ${label}`;

    if (attachment.content) {
      return `${heading}\n${attachment.content}`;
    }

    return heading;
  }).join("\n\n");

  return [cleanPrompt, attachmentContext && `Attached context:\n${attachmentContext}`]
    .filter(Boolean)
    .join("\n\n");
}

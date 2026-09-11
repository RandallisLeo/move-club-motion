'use client';

import { X } from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { Experiment } from '@/data/experiments';

const contactEmail = 'randallisleo@gmail.com';

export function StudyCodeContact({ study }: { study: Experiment }) {
  const emailSubject = encodeURIComponent(`Move Club — ${study.title}`);

  return (
    <Dialog>
      <DialogTrigger className="project-code-button" aria-label={`Contact Randall about ${study.title}`}>
        Code
      </DialogTrigger>
      <DialogContent className="code-contact-dialog ring-0" showCloseButton={false}>
        <DialogClose className="code-contact-close" aria-label="Close contact dialog">
          <X size={18} strokeWidth={1.6} aria-hidden="true" />
        </DialogClose>
        <p className="code-contact-study">{study.index} / {study.title}</p>
        <DialogTitle className="code-contact-title">Let’s talk motion.</DialogTitle>
        <DialogDescription className="code-contact-description">
          Curious about this study? I’d love to hear from you. Say hello on X or send me an email.
        </DialogDescription>
        <div className="code-contact-links">
          <a href="https://x.com/ChadRunz" target="_blank" rel="noopener noreferrer">
            <span>X / Twitter</span>
            <span className="code-contact-address">@ChadRunz</span>
          </a>
          <a href={`mailto:${contactEmail}?subject=${emailSubject}`}>
            <span>Email</span>
            <span className="code-contact-address">{contactEmail}</span>
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}

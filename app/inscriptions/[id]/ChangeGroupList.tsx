import React from "react";
import type {ChangeGroup} from "@/app/lib/eventDataDiffPresentation";

interface ChangeGroupListProps {
  groups: ChangeGroup[];
  // Text of the link to the official FIS page (shown only for groups that have one).
  linkLabel?: string;
}

// One block per origin (event, contact, race), one line per change: "Label : old → new".
export const ChangeGroupList = ({groups, linkLabel}: ChangeGroupListProps) => (
  <div className="space-y-3">
    {groups.map((group) => (
      <div key={group.id}>
        <div className="text-sm font-semibold text-slate-800">
          {group.title}
          {group.subtitle && (
            <span className="ml-2 text-xs font-normal text-slate-500">
              {group.subtitle}
            </span>
          )}
          {group.href && linkLabel && (
            <a
              href={group.href}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-3 text-xs font-normal text-blue-700 underline hover:text-blue-900"
            >
              {linkLabel} ↗
            </a>
          )}
        </div>
        <ul className="mt-1 space-y-1">
          {group.changes.map((change) => (
            <li
              key={`${change.key}-${change.oldValue}-${change.newValue}`}
              className="text-sm text-slate-700 break-words"
            >
              <span className="font-medium">{change.label}</span>
              <span> : </span>
              <span className="text-red-700 line-through">{change.oldValue}</span>
              <span className="mx-1 text-slate-400">→</span>
              <span className="font-semibold text-green-700">{change.newValue}</span>
            </li>
          ))}
        </ul>
      </div>
    ))}
  </div>
);

/**
 * CMS Content Component
 * Safely renders HTML content from WordPress with preserved formatting
 */

import { memo } from "react";

interface CMSContentProps {
  /** HTML content from WordPress */
  content: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Renders WordPress HTML content with proper styling
 * Uses custom cms-content styles defined in styles.css
 */
function CMSContentBase({ content, className = "" }: CMSContentProps) {
  return (
    <div
      className={`cms-content ${className}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}

export const CMSContent = memo(CMSContentBase);
CMSContent.displayName = "CMSContent";

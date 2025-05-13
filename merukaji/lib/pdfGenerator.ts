// lib/pdfGenerator.ts
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { VideoMetadata } from '@/types/youtube';

// Helper function to clean text for PDF
const cleanTextForPDF = (text: string): string => {
    // Remove HTML tags
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/br>/gi, '\n');
    text = text.replace(/<[^>]*>/g, '');

    // Remove markdown bold (**text** or __text__)
    text = text.replace(/\*\*(.*?)\*\*/g, '$1');
    text = text.replace(/__(.*?)__/g, '$1');

    // Remove markdown italic (*text* or _text_)
    text = text.replace(/\*([^*]+)\*/g, '$1');
    text = text.replace(/_([^_]+)_/g, '$1');

    // Convert HTML entities
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>')
    text = text.replace(/&#39;/g, "'");
    text = text.replace(/&nbsp;/g, ' ');

    return text;
};

// Create PDF Document from summary data
export const generateSummaryPDF = (
    summary: string,
    metadata: VideoMetadata | undefined,
    timestamp: string | null | undefined
): Blob => {
    // Initialize PDF document (A4 format)
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    // Clean the summary text
    const cleanedSummary = cleanTextForPDF(summary);

    // Add header with title and metadata
    addHeader(doc, metadata);

    // Add summary meta info
    addMetaInfo(doc, timestamp);

    // Add summary content with cleaned text
    addSummaryContent(doc, cleanedSummary);

    // Add footer with page numbers
    addFooter(doc);

    // Return as blob for download
    return doc.output('blob') as Blob;
};

// Add header with title and metadata
const addHeader = (doc: jsPDF, metadata?: VideoMetadata) => {
    // Set up header background
    doc.setFillColor(250, 250, 250);
    doc.rect(0, 0, 210, 40, 'F');

    // Add title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(33, 33, 33);

    const cleanTitle = cleanTextForPDF(metadata?.title || 'Video Summary');
    const splitTitle = doc.splitTextToSize(cleanTitle, 170);
    doc.text(splitTitle, 20, 20);

    // Add channel and date info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);

    const yPos = splitTitle.length > 1 ? 35 : 30;

    if (metadata?.channelTitle) {
        const cleanChannel = cleanTextForPDF(metadata.channelTitle);
        doc.text(`Channel: ${cleanChannel}`, 20, yPos);
    }

    if (metadata?.publishedAt) {
        const publishDate = new Date(metadata.publishedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        doc.text(`Published: ${publishDate}`, metadata?.channelTitle ? 120 : 20, yPos);
    }
};

// Add meta information section
const addMetaInfo = (doc: jsPDF, timestamp?: string | null) => {
    const yPos = 50;

    doc.setFillColor(255, 255, 255);
    doc.rect(15, yPos - 5, 180, 15, 'F');

    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.setFont('helvetica', 'italic');

    if (timestamp) {
        const formattedDate = new Date(timestamp).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        doc.text(`Summary generated: ${formattedDate}`, 20, yPos);
    }

    // Add separator line
    doc.setDrawColor(240, 240, 240);
    doc.setLineWidth(0.5);
    doc.line(20, yPos + 5, 190, yPos + 5);
};

// Add formatted summary content
const addSummaryContent = (doc: jsPDF, summary: string) => {
    let currentY = 65;
    const pageWidth = 210;
    const margin = 20;
    const contentWidth = pageWidth - (2 * margin);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);

    // Parse the summary into sections
    const sections = summary.split(/\n\n+/);

    sections.forEach((section) => {
        // Check if we need a new page
        if (currentY > 260) {
            doc.addPage();
            currentY = 30;
        }

        // Check if this section is a heading (simple heuristic)
        const isHeading = section.length < 100 && !section.includes('.') && !section.includes(':');

        if (isHeading) {
            // Style as heading
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(13);
            doc.setTextColor(30, 30, 30);

            const headingText = section.trim();
            doc.text(headingText, margin, currentY);
            currentY += 10;

            // Reset to normal text
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            doc.setTextColor(50, 50, 50);
        } else {
            // Handle regular paragraphs and lists
            const lines = section.split('\n');

            lines.forEach((line) => {
                // Check for new page
                if (currentY > 260) {
                    doc.addPage();
                    currentY = 30;
                }

                const trimmedLine = line.trim();

                // Check if it's a bullet point
                const bulletMatch = trimmedLine.match(/^[-•*]\s*(.+)$/);

                if (bulletMatch) {
                    // Render as bullet point
                    doc.setFillColor(255, 152, 71); // Orange color for bullets
                    doc.circle(margin + 3, currentY - 2, 1.5, 'F');

                    const bulletText = bulletMatch[1];
                    const splitText = doc.splitTextToSize(bulletText, contentWidth - 15);
                    doc.text(splitText, margin + 10, currentY);
                    currentY += splitText.length * 5;
                } else if (trimmedLine) {
                    // Regular text
                    const splitText = doc.splitTextToSize(trimmedLine, contentWidth);
                    doc.text(splitText, margin, currentY);
                    currentY += splitText.length * 5;
                }
            });

            // Add spacing after paragraph
            currentY += 8;
        }
    });
};

// Add footer with page numbers
const addFooter = (doc: jsPDF) => {
    const pageCount = doc.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        // Footer background
        doc.setFillColor(250, 250, 250);
        doc.rect(0, 280, 210, 17, 'F');

        // Footer text
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150, 150, 150);

        // Merukaji branding (centered)
        doc.text('Powered by Merukaji', 105, 290, { align: 'center' });

        // Page numbers (right aligned)
        doc.text(`Page ${i} of ${pageCount}`, 190, 290, { align: 'right' });

        // Subtle top border for footer
        doc.setDrawColor(240, 240, 240);
        doc.setLineWidth(0.3);
        doc.line(0, 280, 210, 280);
    }
};
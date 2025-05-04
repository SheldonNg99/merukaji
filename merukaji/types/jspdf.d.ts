// types/jspdf.d.ts
declare module 'jspdf' {
    type TextAlign = 'left' | 'center' | 'right' | 'justify';

    interface TextOptionsLight {
        align?: TextAlign;
        baseline?: string;
        angle?: number;
        renderingMode?: string;
        maxWidth?: number;
    }

    interface PageInfo {
        width: number;
        height: number;
        getWidth: () => number;
        getHeight: () => number;
    }

    interface InternalState {
        pageSize: PageInfo;
        pages: unknown[];
        currentPage: number;
        // Add other specific properties as needed instead of using any
    }

    // Define output types
    type OutputType = 'arraybuffer' | 'blob' | 'bloburi' | 'bloburl' | 'datauristring' | 'dataurlstring' | 'datauri' | 'dataurl' | 'pdfobjectnewwindow' | 'pdfjsnewwindow' | 'string';

    interface OutputOptions {
        filename?: string;
        contentDispositionName?: string;
    }

    interface jsPDF {
        internal: InternalState;
        text(text: string, x: number, y: number, options?: TextOptionsLight): jsPDF;
        setFont(fontName: string, fontStyle?: string): jsPDF;
        setFontSize(size: number): jsPDF;
        setTextColor(r: number, g: number, b: number): jsPDF;
        setDrawColor(r: number, g: number, b: number): jsPDF;
        line(x1: number, y1: number, x2: number, y2: number): jsPDF;
        splitTextToSize(text: string, maxWidth: number): string[];
        getNumberOfPages(): number;
        setPage(pageNumber: number): jsPDF;
        saveGraphicsState(): jsPDF;
        restoreGraphicsState(): jsPDF;
        output(type: OutputType, options?: OutputOptions): string | ArrayBuffer | Blob | Window;
    }

    interface jsPDFOptions {
        orientation?: 'portrait' | 'landscape';
        unit?: 'pt' | 'mm' | 'cm' | 'in';
        format?: string;
        hotfixes?: string[];
    }

    const jsPDF: {
        new(options?: jsPDFOptions): jsPDF;
    };

    export default jsPDF;
}
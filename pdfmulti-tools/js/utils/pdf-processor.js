// PDF.js worker script
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

class PDFProcessor {
    constructor() {
        this.pdfDoc = null;
        this.currentFile = null;
    }

    async loadPDF(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            this.pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            this.currentFile = file;
            return {
                numPages: this.pdfDoc.numPages,
                fileSize: file.size
            };
        } catch (error) {
            console.error('Error loading PDF:', error);
            throw new Error('Failed to load PDF file');
        }
    }

    async getPage(pageNumber) {
        if (!this.pdfDoc) {
            throw new Error('No PDF document loaded');
        }
        return await this.pdfDoc.getPage(pageNumber);
    }

    async renderPageToCanvas(page, canvas, scale = 1.5) {
        const viewport = page.getViewport({ scale });
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;
    }

    async convertPageToImage(page, options = {}) {
        const { scale = 1.5, format = 'image/jpeg', quality = 0.92 } = options;
        const canvas = document.createElement('canvas');
        await this.renderPageToCanvas(page, canvas, scale);
        return canvas.toDataURL(format, quality);
    }

    async getPageText(page) {
        const textContent = await page.getTextContent();
        return textContent.items.map(item => item.str).join(' ');
    }

    async extractImages(page) {
        const operatorList = await page.getOperatorList();
        const images = [];
        
        for (let i = 0; i < operatorList.fnArray.length; i++) {
            if (operatorList.fnArray[i] === pdfjsLib.OPS.paintImageXObject) {
                const imgName = operatorList.argsArray[i][0];
                const img = await page.objs.get(imgName);
                if (img) {
                    images.push(img);
                }
            }
        }
        
        return images;
    }

    async getMetadata() {
        if (!this.pdfDoc) {
            throw new Error('No PDF document loaded');
        }
        return await this.pdfDoc.getMetadata();
    }

    async getPageCount() {
        if (!this.pdfDoc) {
            throw new Error('No PDF document loaded');
        }
        return this.pdfDoc.numPages;
    }

    async getPageSize(pageNumber) {
        const page = await this.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1 });
        return {
            width: viewport.width,
            height: viewport.height
        };
    }

    async getPageRotation(pageNumber) {
        const page = await this.getPage(pageNumber);
        return page.rotate;
    }

    async getPageAnnotations(pageNumber) {
        const page = await this.getPage(pageNumber);
        return await page.getAnnotations();
    }

    async getPageLinks(pageNumber) {
        const page = await this.getPage(pageNumber);
        return await page.getAnnotations().filter(annotation => annotation.subtype === 'Link');
    }

    async getPageFormFields(pageNumber) {
        const page = await this.getPage(pageNumber);
        return await page.getAnnotations().filter(annotation => annotation.subtype === 'Widget');
    }

    async getPageThumbnail(pageNumber, size = 200) {
        const page = await this.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1 });
        const scale = size / Math.max(viewport.width, viewport.height);
        const canvas = document.createElement('canvas');
        await this.renderPageToCanvas(page, canvas, scale);
        return canvas.toDataURL('image/jpeg', 0.7);
    }

    async getPageContentStream(pageNumber) {
        const page = await this.getPage(pageNumber);
        return await page.getOperatorList();
    }

    async getPageTextContent(pageNumber) {
        const page = await this.getPage(pageNumber);
        return await page.getTextContent();
    }

    async getPageGraphics(pageNumber) {
        const page = await this.getPage(pageNumber);
        const operatorList = await page.getOperatorList();
        return operatorList.fnArray.filter(fn => [
            pdfjsLib.OPS.paintXObject,
            pdfjsLib.OPS.paintImageXObject,
            pdfjsLib.OPS.paintInlineImageXObject,
            pdfjsLib.OPS.paintInlineImageXObjectGroup,
            pdfjsLib.OPS.paintImageMaskXObject,
            pdfjsLib.OPS.paintImageMaskXObjectGroup
        ].includes(fn));
    }

    async getPageFonts(pageNumber) {
        const page = await this.getPage(pageNumber);
        return await page.getTextContent().then(content => {
            const fonts = new Set();
            content.items.forEach(item => {
                if (item.fontName) {
                    fonts.add(item.fontName);
                }
            });
            return Array.from(fonts);
        });
    }

    async getPageColors(pageNumber) {
        const page = await this.getPage(pageNumber);
        const operatorList = await page.getOperatorList();
        const colors = new Set();
        
        for (let i = 0; i < operatorList.fnArray.length; i++) {
            if (operatorList.fnArray[i] === pdfjsLib.OPS.setFillColor) {
                colors.add(JSON.stringify(operatorList.argsArray[i]));
            }
            if (operatorList.fnArray[i] === pdfjsLib.OPS.setStrokeColor) {
                colors.add(JSON.stringify(operatorList.argsArray[i]));
            }
        }
        
        return Array.from(colors).map(color => JSON.parse(color));
    }
}

// Export the PDFProcessor class
window.PDFProcessor = PDFProcessor; 
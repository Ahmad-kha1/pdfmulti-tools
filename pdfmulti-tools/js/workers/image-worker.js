// Import libraries
importScripts('../lib/pdf-lib.min.js');

// Handle messages from main thread
onmessage = async function(e) {
    const { action, images, options } = e.data;
    
    if (action === 'convertImagesToPDF') {
        try {
            await convertImagesToPDF(images, options);
        } catch (error) {
            postMessage({ error: error.message });
        }
    }
};

// Convert images to PDF
async function convertImagesToPDF(images, options) {
    // Send initial progress
    postMessage({ type: 'progress', progress: 10, message: 'Initializing PDF document...' });
    
    try {
        const { PDFDocument, PageSizes } = PDFLib;
        const pdfDoc = await PDFDocument.create();
        
        // Set page size
        let dimensions = PageSizes.A4;
        if (options.pageSize === 'Letter') dimensions = PageSizes.Letter;
        else if (options.pageSize === 'Legal') dimensions = PageSizes.Legal;
        
        // Adjust dimensions for orientation
        if (options.pageOrientation === 'landscape') {
            dimensions = [dimensions[1], dimensions[0]];
        }
        
        // Process images
        for (let i = 0; i < images.length; i++) {
            const image = images[i];
            const progress = 10 + ((i + 1) / images.length) * 80;
            
            postMessage({ 
                type: 'progress', 
                progress, 
                message: `Processing image ${i + 1} of ${images.length}...` 
            });
            
            // Create page
            const page = pdfDoc.addPage(dimensions);
            
            // Embed image
            let pdfImage;
            if (image.type === 'image/jpeg' || image.type === 'image/jpg') {
                pdfImage = await pdfDoc.embedJpg(image.data);
            } else if (image.type === 'image/gif') {
                pdfImage = await pdfDoc.embedPng(image.data);
            } else {
                pdfImage = await pdfDoc.embedPng(image.data);
            }
            
            // Calculate dimensions
            const imgDims = pdfImage.scale(1);
            let scaleFactor = Math.min(
                (page.getWidth() - options.margin * 2) / imgDims.width,
                (page.getHeight() - options.margin * 2) / imgDims.height
            );
            
            // Adjust quality
            if (options.imageQuality === 'medium') scaleFactor *= 0.75;
            else if (options.imageQuality === 'low') scaleFactor *= 0.5;
            
            // Center image on page
            const scaledWidth = imgDims.width * scaleFactor;
            const scaledHeight = imgDims.height * scaleFactor;
            const x = (page.getWidth() - scaledWidth) / 2;
            const y = (page.getHeight() - scaledHeight) / 2;
            
            // Draw image
            page.drawImage(pdfImage, {
                x,
                y,
                width: scaledWidth,
                height: scaledHeight,
            });
            
            // Small delay to allow UI updates
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        
        // Finalize PDF
        postMessage({ type: 'progress', progress: 95, message: 'Finalizing PDF...' });
        const pdfBytes = await pdfDoc.save();
        
        // Send completed PDF back to main thread
        postMessage({ 
            type: 'complete',
            pdfBuffer: pdfBytes 
        });
        
    } catch (error) {
        console.error('Error in worker:', error);
        postMessage({ error: 'Failed to convert images: ' + error.message });
    }
} 
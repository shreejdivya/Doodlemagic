import React from 'react';
import { GeneratedScene } from '../types';
import { DownloadIcon } from './IconComponents';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface StorybookViewProps {
    scenes: GeneratedScene[];
    title: string | null;
}

const StorybookView: React.FC<StorybookViewProps> = ({ scenes, title }) => {

    const handleDownloadPdf = async () => {
        const input = document.getElementById("storybook-pdf-content");
        if (!input) return;

        // Convert the content into a canvas
        const canvas = await html2canvas(input, { scale: 2 });
        const imgData = canvas.toDataURL("image/png");

        // Create a PDF
        const pdf = new jsPDF("p", "mm", "a4");
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = 0;

        // First page
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        // Add extra pages if needed
        while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        pdf.save(`${title || "storybook"}.pdf`);
    };

    return (
        <div>
            {/* This wrapper div is what gets printed */}
            <div id="storybook-pdf-content" className="p-4 bg-slate-50 rounded-lg">
                {title && <h2 className="text-4xl font-extrabold text-center mb-10 text-gray-800 tracking-tight">{title}</h2>}
                <div className="space-y-12">
                    {scenes.map((scene, index) => (
                        <div 
                            key={scene.scene_number} 
                            className={`grid grid-cols-1 md:grid-cols-2 gap-8 items-center page-break-inside-avoid`}
                        >
                            <div className={`w-full bg-gray-100 rounded-xl shadow-lg overflow-hidden ${index % 2 === 1 ? 'md:order-last' : ''}`}>
                                <img 
                                    src={scene.imageUrl} 
                                    alt={`Scene ${scene.scene_number}`} 
                                    className="w-full h-auto" 
                                />
                            </div>
                            <div className="flex flex-col justify-center">
                                <p className="text-gray-700 text-lg mb-4 whitespace-pre-line italic font-serif">{scene.rhyming_stanza}</p>
                                <blockquote className="p-3 border-l-4 border-violet-200 bg-violet-50 text-violet-800 text-lg italic rounded-r-lg">
                                    "{scene.conversation}"
                                </blockquote>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="mt-8 text-center print-hide">
                <button 
                    onClick={handleDownloadPdf} 
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-teal-500 hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-transform transform hover:scale-105"
                >
                    <DownloadIcon className="h-5 w-5 mr-2" /> Download Story as PDF
                </button>
            </div>
        </div>
    );
};

export default StorybookView;
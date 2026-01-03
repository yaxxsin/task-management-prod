import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import { format, parseISO } from 'date-fns';
import type { Task } from '../types';

interface ReportData {
    template: string;
    name: string;
    position: string;
    office: string;
    year: number;
    month: number;
    period: string;
    dateFrom: string;
    dateTo: string;
    reviewedBy: string;
    verifiedBy: string;
    approvedBy: string;
    acceptedBy?: string;
}

export const generateReportDocument = (reportTasks: Task[], formData: ReportData): Document => {
    let documentChildren;

    // Helper to create signature block
    const createSignatureBlock = (label: string, name: string, details: string[]) => {
        const paragraphs = [
            new Paragraph({
                children: [new TextRun({ text: label, bold: true, size: 22 })], // 11px approx 11pt/22 size
                spacing: { after: 400 },
            })
        ];

        if (name) {
            paragraphs.push(
                new Paragraph({
                    children: [new TextRun({ text: name.toUpperCase(), bold: true, size: 22 })], // 11px
                })
            );
            details.forEach(detail => {
                if (detail) {
                    paragraphs.push(
                        new Paragraph({
                            children: [new TextRun({ text: detail, size: 22 })], // 11px
                        })
                    );
                }
            });
        } else {
            // Spacing for empty signature
            for (let i = 0; i < 4; i++) paragraphs.push(new Paragraph(""));
        }

        return paragraphs;
    };

    if (formData.template === 'general') {
        // General Template - Standard Format
        documentChildren = [
            new Paragraph({
                text: "INDIVIDUAL ACCOMPLISHMENT REPORT",
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 },
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "Name: ", bold: true }),
                    new TextRun(formData.name),
                ],
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "Position: ", bold: true }),
                    new TextRun(formData.position),
                ],
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "Office: ", bold: true }),
                    new TextRun(formData.office),
                ],
                spacing: { after: 400 },
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "Period: ", bold: true }),
                    new TextRun(`${formData.month}/${formData.year} (${formData.period === '1' ? '1st Half' : '2nd Half'})`),
                ],
                spacing: { after: 400 },
            }),
            new Paragraph({
                text: "ACCOMPLISHMENTS:",
                heading: HeadingLevel.HEADING_2,
                spacing: { after: 200 },
            }),
            ...reportTasks.flatMap(t => [
                new Paragraph({
                    children: [
                        new TextRun({ text: `[${t.status}] ${t.name}`, bold: true }),
                    ],
                    bullet: { level: 0 }
                }),
                ...(t.description ? [new Paragraph({
                    text: t.description,
                    indent: { left: 720 },
                })] : [])
            ]),
            new Paragraph({ text: "", spacing: { after: 400 } }),
            new Paragraph({
                text: "SIGNATURES:",
                heading: HeadingLevel.HEADING_2,
                spacing: { after: 200 },
            }),
            ...(formData.reviewedBy ? createSignatureBlock("Reviewed by:", formData.reviewedBy, []) : []),
            ...(formData.verifiedBy ? createSignatureBlock("Verified by:", formData.verifiedBy, []) : []),
            ...(formData.approvedBy ? createSignatureBlock("Approved by:", formData.approvedBy, []) : [])
        ];
    } else {
        // Custom Template - Accurate layout matching shared Image & Python script
        const start = parseISO(formData.dateFrom);
        const end = parseISO(formData.dateTo);

        // Calculate weeks
        const weeks: Array<{ start: Date; end: Date }> = [];
        let currentStart = new Date(start);
        while (currentStart <= end) {
            while (currentStart <= end && (currentStart.getDay() === 0 || currentStart.getDay() === 6)) {
                currentStart.setDate(currentStart.getDate() + 1);
            }
            if (currentStart > end) break;

            let weekEnd = new Date(currentStart);
            let d = 0;
            while (d < 4 && weekEnd < end) {
                weekEnd.setDate(weekEnd.getDate() + 1);
                if (weekEnd.getDay() !== 0 && weekEnd.getDay() !== 6) d++;
            }
            if (weekEnd > end) weekEnd = new Date(end);

            weeks.push({ start: new Date(currentStart), end: new Date(weekEnd) });
            currentStart = new Date(weekEnd);
            currentStart.setDate(currentStart.getDate() + 1);
        }

        const tasksPerWeek = Math.floor(reportTasks.length / weeks.length);
        const remainder = reportTasks.length % weeks.length;

        const tableRows: TableRow[] = [
            new TableRow({
                children: [
                    new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: "PERIOD/ WEEK", bold: true, size: 22 })] })],
                        width: { size: 1.5, type: WidthType.DXA }, // Narrower (matched to 1.5 inches roughly)
                    }),
                    new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: "ACCOMPLISHMENT / OUTPUT", bold: true, size: 22 })] })],
                        width: { size: 5.5, type: WidthType.DXA }, // Wider (matched to 5.5 inches roughly)
                    }),
                ],
            })
        ];

        let taskIdx = 0;
        weeks.forEach((week, i) => {
            const count = tasksPerWeek + (i < remainder ? 1 : 0);
            const wTasks = reportTasks.slice(taskIdx, taskIdx + count);
            taskIdx += count;

            if (wTasks.length > 0) {
                const label = week.start.getTime() === week.end.getTime()
                    ? format(week.start, 'MMMM dd, yyyy')
                    : format(week.start, 'MMMM dd') + "-" + format(week.end, 'dd, yyyy');

                tableRows.push(new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: label, size: 22 })], spacing: { before: 100 } })] }),
                        new TableCell({
                            children: wTasks.map(t => new Paragraph({
                                children: [new TextRun({ text: t.name, size: 22 })],
                                bullet: { level: 0 },
                                spacing: { before: 50, after: 50 }
                            })),
                        }),
                    ],
                }));
            }
        });

        const accomplishmentTable = new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
                top: { style: BorderStyle.SINGLE, size: 12 },
                bottom: { style: BorderStyle.SINGLE, size: 12 },
                left: { style: BorderStyle.SINGLE, size: 12 },
                right: { style: BorderStyle.SINGLE, size: 12 },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 12 },
                insideVertical: { style: BorderStyle.SINGLE, size: 12 },
            },
        });

        // 2-Column Signature Layout
        const sigTable = new Table({
            rows: [
                new TableRow({
                    children: [
                        new TableCell({
                            children: [
                                ...createSignatureBlock("Prepared by:", formData.name, [formData.position, formData.office]),
                                ...createSignatureBlock("Verified by:", formData.verifiedBy, []),
                                ...createSignatureBlock("Accepted by:", formData.acceptedBy || "", []),
                            ],
                            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                        }),
                        new TableCell({
                            children: [
                                ...createSignatureBlock("Reviewed by:", formData.reviewedBy, []),
                                ...createSignatureBlock("Approved by:", formData.approvedBy, []),
                            ],
                            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                        }),
                    ],
                }),
            ],
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
                top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
                insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE }
            }
        });

        documentChildren = [
            new Paragraph({
                children: [new TextRun({ text: "INDIVIDUAL ACCOMPLISHMENT REPORT", bold: true, size: 28 })],
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 },
            }),
            new Paragraph({ children: [new TextRun({ text: "NAME: ", bold: true, size: 22 }), new TextRun({ text: formData.name, bold: true, size: 22 })] }),
            new Paragraph({ children: [new TextRun({ text: "POSITION: ", bold: true, size: 22 }), new TextRun({ text: formData.position, size: 22 })] }),
            new Paragraph({ children: [new TextRun({ text: "OFFICE: ", bold: true, size: 22 }), new TextRun({ text: formData.office, size: 22 })] }),
            new Paragraph({ children: [new TextRun({ text: "DATE: ", bold: true, size: 22 }), new TextRun({ text: format(start, 'MMMM dd') + "-" + format(end, 'dd, yyyy'), size: 22 })], spacing: { after: 400 } }),
            accomplishmentTable,
            new Paragraph({ text: "", spacing: { after: 400 } }),
            sigTable
        ];
    }

    return new Document({
        sections: [{
            properties: {
                page: {
                    margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } // 1 inch
                }
            },
            children: documentChildren,
        }],
    });
};

import html2canvas from 'html2canvas'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import type { CarouselData } from '../types'

export const exportSlideAsImage = async (el: HTMLElement, scale = 3.6): Promise<Blob> => {
  const canvas = await html2canvas(el, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: null,
    logging: false,
  })
  return new Promise(resolve => canvas.toBlob(b => resolve(b!), 'image/png'))
}

export const exportAllSlidesAsZip = async (
  slideEls: HTMLElement[],
  projectName: string
): Promise<void> => {
  const zip = new JSZip()
  const folder = zip.folder(projectName) || zip
  for (let i = 0; i < slideEls.length; i++) {
    const blob = await exportSlideAsImage(slideEls[i])
    folder.file(`slide-${String(i + 1).padStart(2, '0')}.png`, blob)
  }
  const content = await zip.generateAsync({ type: 'blob' })
  saveAs(content, `${projectName}-slides.zip`)
}

export const exportCaptionAsTxt = (caption: CarouselData['caption'], projectName: string): void => {
  const content = `LEGENDA — ${projectName}\n${'='.repeat(50)}\n\n${caption.hook}\n\n${caption.body}\n\n${caption.cta}\n\n${caption.hashtags}\n\nAlt Text: ${caption.altText || ''}`
  saveAs(new Blob([content], { type: 'text/plain;charset=utf-8' }), `${projectName}-legenda.txt`)
}

export const exportManyChatAsTxt = (mc: CarouselData['manychat'], projectName: string): void => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatFlow = (flow: typeof mc.flow2) => {
    if (typeof flow === 'string') return flow
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (Array.isArray(flow)) return (flow as any[]).map((f: any) => `  ${f.step}: ${f.message}`).join('\n')
    return ''
  }
  const content = `MANYCHAT — ${projectName}\n${'='.repeat(50)}\nKeyword: ${mc.keyword}\n\nFlow 1 (Boas-vindas):\n${mc.flow1}\n\nFlow 2 (Entrega):\n${formatFlow(mc.flow2)}\n\nFlow 3 (Follow-up):\n${formatFlow(mc.flow3)}`
  saveAs(new Blob([content], { type: 'text/plain;charset=utf-8' }), `${projectName}-manychat.txt`)
}

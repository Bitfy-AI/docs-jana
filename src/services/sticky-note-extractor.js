/**
 * Sticky Note Extractor Service
 * Extracts and processes sticky notes from n8n workflows
 */

class StickyNoteExtractor {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Extract all sticky notes from a workflow
   * @param {object} workflow - Workflow JSON data
   * @returns {Array} Array of sticky notes with position
   */
  extractStickyNotes(workflow) {
    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      this.logger.warn(`Workflow ${workflow.name} has no nodes`);
      return [];
    }

    const stickyNotes = workflow.nodes
      .filter(node => node.type === 'n8n-nodes-base.stickyNote')
      .map(node => ({
        name: node.name,
        content: node.parameters?.content || '',
        position: node.position || [0, 0],
        color: node.parameters?.color,
        height: node.parameters?.height,
        width: node.parameters?.width,
      }))
      .filter(note => note.content.trim().length > 0); // Only non-empty notes

    return stickyNotes;
  }

  /**
   * Get the first sticky note (top-left position)
   * @param {object} workflow - Workflow JSON data
   * @returns {object|null} First sticky note or null
   */
  getFirstStickyNote(workflow) {
    const stickyNotes = this.extractStickyNotes(workflow);

    if (stickyNotes.length === 0) {
      return null;
    }

    // Sort by position: first by X (left to right), then by Y (top to bottom)
    const sorted = stickyNotes.sort((a, b) => {
      const [ax, ay] = a.position;
      const [bx, by] = b.position;

      // Sort by X first
      if (ax !== bx) {
        return ax - bx;
      }
      // If X is the same, sort by Y
      return ay - by;
    });

    return {
      content: sorted[0].content,
      position: sorted[0].position,
      name: sorted[0].name,
    };
  }

  /**
   * Extract workflow metadata
   * @param {object} workflow - Workflow JSON data
   * @returns {object} Metadata
   */
  extractMetadata(workflow) {
    return {
      id: workflow.id,
      name: workflow.name,
      active: workflow.active,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
      tags: workflow.tags || [],
      nodeCount: workflow.nodes?.length || 0,
    };
  }

  /**
   * Process workflow and extract first sticky note with metadata
   * @param {object} workflow - Workflow JSON data
   * @returns {object} Processed workflow info
   */
  processWorkflow(workflow) {
    const metadata = this.extractMetadata(workflow);
    const firstStickyNote = this.getFirstStickyNote(workflow);

    return {
      ...metadata,
      firstStickyNote: firstStickyNote ? firstStickyNote.content : null,
      stickyNotePosition: firstStickyNote ? firstStickyNote.position : null,
      hasDescription: Boolean(firstStickyNote),
    };
  }

  /**
   * Clean and format sticky note content
   * @param {string} content - Raw sticky note content
   * @returns {string} Cleaned content
   */
  cleanContent(content) {
    if (!content) return '';

    return content
      .trim()
      .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with max 2
      .replace(/^\s+/gm, ''); // Remove leading spaces from lines
  }
}

module.exports = StickyNoteExtractor;
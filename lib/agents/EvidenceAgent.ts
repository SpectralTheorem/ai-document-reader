import Anthropic from '@anthropic-ai/sdk';
import { BaseAgent } from './BaseAgent';
import { ResearchQuery, BookContext, AgentResult, EvidenceResult } from './types';
import { debugEmitter } from './debug-types';

export class EvidenceAgent extends BaseAgent {
  name = 'EvidenceAgent';
  description = 'Specialized agent for claim verification, fact-checking, and gathering supporting evidence';

  async execute(query: ResearchQuery, context: BookContext, sessionId?: string): Promise<AgentResult> {
    const startTime = Date.now();
    const agentId = `${this.name}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    // Emit debug event for agent start
    if (sessionId) {
      debugEmitter.emit({
        type: 'agent_started',
        timestamp: startTime,
        sessionId,
        data: {
          agentId,
          agentName: this.name,
          query: query.text
        }
      });
    }

    const systemPrompt = `You are an expert research assistant specialized in evidence analysis and claim verification. Your tasks include:

1. Identify claims or statements in the user's query that need evidence
2. Search through the book content for supporting and contradicting evidence
3. Categorize evidence types (examples, statistics, quotes, case studies, expert opinions)
4. Evaluate the strength and quality of evidence presented
5. Note any gaps in evidence or areas where claims are unsupported

For each piece of evidence found, consider:
- Is this direct evidence or circumstantial?
- How credible is the source within the book's context?
- Are there any contradictory statements elsewhere?
- What type of evidence is this (empirical data, anecdotal, theoretical)?

Format your response as:
CLAIMS_IDENTIFIED:
1. [Specific claim from query]

SUPPORTING_EVIDENCE:
1. [Evidence description] - [Evidence type: statistic/example/quote/case_study]
   Source: [Section/Chapter]
   Strength: [Strong/Moderate/Weak]
   Quote: "[Specific passage]"

CONTRADICTING_EVIDENCE:
1. [Any contradictory evidence found]

EVIDENCE_GAPS:
- [Areas where evidence is lacking or insufficient]

OVERALL_ASSESSMENT: [Your assessment of how well-supported the claims are]

CONFIDENCE: [0.0-1.0]`;

    const bookContent = this.parseBookContent(context);

    const userPrompt = `Please analyze the evidence for any claims in this query: "${query.text}"

Book Content:
${bookContent}

Focus on finding concrete evidence, data, examples, and expert opinions that either support or contradict any claims made in the query or implied by the question.`;

    try {
      const response = await this.callClaude(systemPrompt, userPrompt, true, sessionId, agentId);

      const findings = this.parseEvidenceFindings(response);
      const confidence = this.extractConfidence(response);
      const sources = this.extractSourceReferences(response, context);

      const executionTime = Date.now() - startTime;

      const result = this.createAgentResult(
        query.id,
        findings,
        confidence,
        sources,
        executionTime
      );

      // Emit debug event for agent completion
      if (sessionId) {
        debugEmitter.emit({
          type: 'agent_completed',
          timestamp: Date.now(),
          sessionId,
          data: {
            agentId,
            agentName: this.name,
            duration: executionTime,
            findings,
            confidence,
            sources,
            rawOutput: response
          }
        });
      }

      return result;
    } catch (error) {
      console.error('EvidenceAgent execution failed:', error);

      // Emit debug event for agent failure
      if (sessionId) {
        debugEmitter.emit({
          type: 'agent_failed',
          timestamp: Date.now(),
          sessionId,
          data: {
            agentId,
            agentName: this.name,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }

      throw error;
    }
  }

  private parseEvidenceFindings(response: string): string[] {
    const findings: string[] = [];

    // Extract different sections
    const sections = {
      claims: this.extractSection(response, 'CLAIMS_IDENTIFIED'),
      supporting: this.extractSection(response, 'SUPPORTING_EVIDENCE'),
      contradicting: this.extractSection(response, 'CONTRADICTING_EVIDENCE'),
      gaps: this.extractSection(response, 'EVIDENCE_GAPS'),
      assessment: this.extractSection(response, 'OVERALL_ASSESSMENT')
    };

    if (sections.claims) findings.push(`Claims: ${sections.claims}`);
    if (sections.supporting) findings.push(`Supporting Evidence: ${sections.supporting}`);
    if (sections.contradicting) findings.push(`Contradicting Evidence: ${sections.contradicting}`);
    if (sections.gaps) findings.push(`Evidence Gaps: ${sections.gaps}`);
    if (sections.assessment) findings.push(`Assessment: ${sections.assessment}`);

    return findings.length > 0 ? findings : [response];
  }

  private extractSection(response: string, sectionName: string): string | null {
    const regex = new RegExp(`${sectionName}:(.*?)(?=[A-Z_]+:|CONFIDENCE:|$)`, 's');
    const match = response.match(regex);
    return match ? match[1].trim() : null;
  }

  private extractConfidence(response: string): number {
    const confidenceMatch = response.match(/CONFIDENCE:\s*([0-9]*\.?[0-9]+)/);
    if (confidenceMatch) {
      return Math.min(1.0, Math.max(0.0, parseFloat(confidenceMatch[1])));
    }
    return 0.7;
  }

  // Specialized method for fact-checking specific claims
  async verifyClaimInBook(
    claim: string,
    context: BookContext
  ): Promise<EvidenceResult> {
    const systemPrompt = `You are a fact-checker analyzing a specific claim against book content.

Evaluate the claim: "${claim}"

Provide your analysis in this JSON format:
{
  "claim": "${claim}",
  "supportingEvidence": [
    {
      "sectionId": "section_id",
      "sectionTitle": "Section Title",
      "excerpt": "Relevant passage...",
      "relevanceScore": 0.9
    }
  ],
  "contradictingEvidence": [],
  "evidenceTypes": ["statistic", "example"],
  "strength": "strong"
}

Strength options: strong, moderate, weak`;

    const bookContent = this.parseBookContent(context);
    const userPrompt = `Book Content:
${bookContent}

Analyze the claim: "${claim}"`;

    try {
      const response = await this.callClaude(systemPrompt, userPrompt, false);

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed as EvidenceResult;
      }

      // Fallback if JSON parsing fails
      return {
        claim,
        supportingEvidence: [],
        contradictingEvidence: [],
        evidenceTypes: [],
        strength: 'weak'
      };
    } catch (error) {
      console.error('Claim verification failed:', error);
      return {
        claim,
        supportingEvidence: [],
        contradictingEvidence: [],
        evidenceTypes: [],
        strength: 'weak'
      };
    }
  }
}
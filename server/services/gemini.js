import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env.js';
import { validateMysteryCase } from './validator.js';

let genAIClient = null;
if (config.geminiApiKey) {
  genAIClient = new GoogleGenerativeAI(config.geminiApiKey);
}

/**
 * Procedural fallback mystery generator when Gemini API is unavailable,
 * unconfigured, or when running offline unit tests.
 */
export function generateProceduralMystery(theme = 'Victorian Noir', difficulty = 'medium') {
  const caseId = `case_${uuidv4().substring(0, 8)}`;
  
  const themesData = {
    'Victorian Noir': {
      title: 'The Arsenic Veil of Blackwood Manor',
      synopsis: 'Lord Arthur Blackwood, an eccentric rare book collector and industrialist, was discovered poisoned in his locked greenhouse at midnight, with faint traces of almond-scented residue on his silver goblet.',
      crime: {
        type: 'Poisoning Homicide',
        victim: 'Lord Arthur Blackwood',
        timeOfCrime: '11:45 PM, October 24th',
        location: 'The Victorian Conservatory',
        details: 'The victim was found slumped over a chess set. The conservatory doors were latched from the inside, with a high ventilation window cracked open.'
      },
      setting: {
        name: 'Blackwood Estate, Yorkshire Moors',
        atmosphere: 'Rain-lashed gothic manor steeped in ancestral secrets and ticking grandfather clocks',
        era: 'Victorian Gothic'
      },
      suspects: [
        {
          id: 'suspect_1',
          name: 'Lady Eleanor Blackwood',
          occupation: 'Widow & Socialite',
          alibi: 'Claims she was in the second-floor gallery penning condolence letters between 11 PM and midnight.',
          motive: 'Discovered Lord Arthur had secretly revised his last will to disinherit her in favor of an orphanage.',
          statement: 'Arthur was intolerable, yes, but I would never soil my family name with poison. Check the cellar keys; I never kept one.',
          relationship: 'Spouse',
          suspicionLevel: 65,
          avatarColor: '#ec4899'
        },
        {
          id: 'suspect_2',
          name: 'Dr. Thaddeus Vance',
          occupation: 'Personal Physician & Botanist',
          alibi: 'Claims he was cataloging rare Peruvian fern spores in the library dispensary until 12:15 AM.',
          motive: 'Lord Arthur threatened to expose Vance for falsifying medical credentials and smuggling restricted alkaloids.',
          statement: 'I administered his prescribed tincture of valerian at 9 PM. If someone laced his goblet later, look to the servants or his insolent nephew.',
          relationship: 'Doctor & Longtime Companion',
          suspicionLevel: 80,
          avatarColor: '#06b6d4'
        },
        {
          id: 'suspect_3',
          name: 'Julian Sterling',
          occupation: 'Nephew & Speculative Investor',
          alibi: 'Claims he was smoking cigars in the billiard room alone while waiting for the thunderstorm to pass.',
          motive: 'Crushed under astronomical gambling debts to maritime loan sharks due by dawn.',
          statement: 'My uncle was generous to a fault, occasionally. Why would I hasten his demise when I needed his endorsement for the Suez venture?',
          relationship: 'Nephew',
          suspicionLevel: 70,
          avatarColor: '#f59e0b'
        },
        {
          id: 'suspect_4',
          name: 'Mrs. Martha Higgins',
          occupation: 'Head Housekeeper',
          alibi: 'Claims she was locking the main larder and counting silver plate with the kitchen maid until 11:30 PM.',
          motive: 'Her brother was wrongfully imprisoned after Lord Arthur testified against him in a boiler scandal 5 years ago.',
          statement: 'I serve this house honorably. The Doctor came down to the scullery asking for warm distilled water just before eleven.',
          relationship: 'Household Staff',
          suspicionLevel: 45,
          avatarColor: '#8b5cf6'
        }
      ],
      evidence: [
        {
          id: 'evidence_1',
          title: 'Engraved Silver Goblet',
          description: 'A heavy silver chalice containing remnants of vintage port wine mixed with concentrated potassium cyanide.',
          type: 'physical',
          locationFound: 'Conservatory chess table',
          relevance: 'High',
          hint: 'The poison was introduced directly into the wine, not during bottling.'
        },
        {
          id: 'evidence_2',
          title: 'Torn Laboratory Prescription Slip',
          description: 'A carbon copy slip from Dr. Vance\'s dispensary notebook with chemical formula for cyanide salt synthesis, dated yesterday.',
          type: 'forensic',
          locationFound: 'Wastebasket behind the library hearth',
          relevance: 'Critical',
          hint: 'The signature matches Dr. Vance\'s distinctive left-handed cursive.'
        },
        {
          id: 'evidence_3',
          title: 'Muddy Footprint by Conservatory Window',
          description: 'A fresh heel impression in the flowerbed under the exterior ventilator, matching a size 9 gentleman\'s boot with a brass heel-plate.',
          type: 'physical',
          locationFound: 'Exterior garden bed beneath the high window',
          relevance: 'High',
          hint: 'Only two individuals in the house wear imported bespoke boots with brass plates.'
        },
        {
          id: 'evidence_4',
          title: 'Stained Silk Pocket Square',
          description: 'A monogrammed linen handkerchief bearing faint traces of copper oxide and bitter almond residue.',
          type: 'forensic',
          locationFound: 'Dr. Vance\'s tweed overcoat pocket in the vestibule',
          relevance: 'Conclusive',
          hint: 'Used to wipe the rim or measure the volatile compound.'
        },
        {
          id: 'evidence_5',
          title: 'Telegram from Scotland Yard',
          description: 'A confidential cable confirming an inquiry into an unlicensed apothecary under Dr. Vance\'s name in London.',
          type: 'document',
          locationFound: 'Lord Arthur\'s locked bureau desk',
          relevance: 'Medium',
          hint: 'Demonstrates Lord Arthur was hours away from reporting Vance to the authorities.'
        }
      ],
      solution: {
        culpritId: 'suspect_2',
        motive: 'Lord Arthur was preparing to dispatch Scotland Yard detectives at dawn to arrest Dr. Vance for medical forgery and illegal apothecary transactions.',
        method: 'Dr. Vance prepared potassium cyanide in his private dispensary, slipped into the conservatory under the pretense of refilling Arthur\'s medicinal cordial, and wiped the vial with his silk handkerchief.',
        conclusiveEvidenceId: 'evidence_4',
        explanation: 'Dr. Vance claimed he never left the dispensary and had no contact with cyanide. However, the silk pocket square in his coat tested positive for cyanide residue and copper oxide, and the prescription slip was torn from his personal notebook.'
      }
    }
  };

  const selected = themesData['Victorian Noir'];
  return {
    caseId,
    title: selected.title,
    synopsis: selected.synopsis,
    crime: selected.crime,
    setting: selected.setting,
    difficulty,
    theme,
    suspects: selected.suspects,
    evidence: selected.evidence,
    solution: selected.solution,
    generatedBy: 'procedural-fallback'
  };
}

/**
 * Generate a complete, verified mystery case using Google Gemini API
 * or fall back if credentials are unconfigured or rate limited.
 */
export async function generateMysteryCase({ theme = 'Classic Noir', difficulty = 'medium', forceMock = false } = {}) {
  // If forceMock or no API key, use procedural generation
  if (forceMock || !config.geminiApiKey) {
    console.log(`[Mystery Generator] Using procedural mock generator (Reason: ${forceMock ? 'forceMock flag' : 'No GEMINI_API_KEY'})`);
    const proceduralCase = generateProceduralMystery(theme, difficulty);
    const validation = validateMysteryCase(proceduralCase);
    if (!validation.valid) {
      throw new Error(`Fallback procedural case failed validation: ${validation.errors.join(', ')}`);
    }
    return {
      case: proceduralCase,
      source: 'mock-engine',
      liveVerified: false
    };
  }

  // Live Google Gemini API execution
  try {
    console.log(`[Gemini Live] Initiating case generation with theme="${theme}", difficulty="${difficulty}"`);
    const model = genAIClient.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const systemPrompt = `You are a master mystery writer and forensic puzzle designer.
Generate a solvable, airtight murder mystery or grand theft investigation puzzle in strict JSON format.

Requirements:
1. Exactly ONE culprit among the suspects.
2. 3 to 5 distinct suspects with unique IDs (e.g., "suspect_1", "suspect_2", etc.).
3. 4 to 6 clues/evidence items with unique IDs (e.g., "evidence_1", "evidence_2", etc.).
4. One piece of evidence must be the "conclusiveEvidenceId" that decisively proves the culprit's guilt and dismantles their alibi.
5. All innocent suspects must have credible alibis that are corroborated or cannot be broken by the conclusive evidence.
6. The output MUST BE VALID JSON only, enclosed in \`\`\`json and \`\`\` code fences or plain JSON.

JSON Schema format:
{
  "title": "Short evocative title",
  "synopsis": "Rich narrative background (at least 30 words)",
  "crime": {
    "type": "Homicide / Grand Heist",
    "victim": "Victim full name",
    "timeOfCrime": "Time string",
    "location": "Crime location",
    "details": "How the crime scene was found"
  },
  "setting": {
    "name": "Location Name",
    "atmosphere": "Atmospheric mood description",
    "era": "e.g. 1920s Noir, Victorian Gothic, or Contemporary Cyberpunk"
  },
  "difficulty": "${difficulty}",
  "theme": "${theme}",
  "suspects": [
    {
      "id": "suspect_1",
      "name": "Full Name",
      "occupation": "Role",
      "alibi": "Where they claim to have been",
      "motive": "Why they might want the victim dead or harmed",
      "statement": "Direct quote testimony given to detectives",
      "relationship": "Relationship to victim",
      "suspicionLevel": 65,
      "avatarColor": "#hexColor"
    }
  ],
  "evidence": [
    {
      "id": "evidence_1",
      "title": "Evidence Title",
      "description": "Detailed physical/forensic description",
      "type": "physical",
      "locationFound": "Location in crime scene",
      "relevance": "High",
      "hint": "Clue hint"
    }
  ],
  "solution": {
    "culpritId": "suspect_2",
    "motive": "The true motive",
    "method": "How they committed the crime",
    "conclusiveEvidenceId": "evidence_3",
    "explanation": "Full step-by-step logical breakdown of how the evidence points solely to the culprit"
  }
}`;

    const result = await model.generateContent(systemPrompt);
    const text = result.response.text();

    // Clean JSON markdown code fences if present
    let jsonText = text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(jsonText);
    parsed.caseId = `case_${uuidv4().substring(0, 8)}`;

    // Validate generated case
    const validation = validateMysteryCase(parsed);
    if (!validation.valid) {
      console.warn(`[Gemini Live] Generated case failed logical schema validation:`, validation.errors);
      throw new Error(`Generated case failed validation: ${validation.errors.join('; ')}`);
    }

    parsed.generatedBy = 'gemini-live';
    console.log(`[Gemini Live] Successfully generated and verified case "${parsed.title}" (ID: ${parsed.caseId})`);

    return {
      case: parsed,
      source: 'gemini-live',
      liveVerified: true
    };
  } catch (error) {
    console.error(`[Gemini Live Error] Failed to generate live case: ${error.message}`);
    // If live API failed (quota, timeout, invalid key), provide seamless fallback with note
    const fallback = generateProceduralMystery(theme, difficulty);
    fallback.fallbackReason = error.message;
    return {
      case: fallback,
      source: 'procedural-fallback',
      liveVerified: false,
      error: error.message
    };
  }
}

import { useState } from 'react';

interface InseeData {
  siren: string;
  siret: string;
  raisonSociale: string;
  formeJuridique: string;
  dateCreation: string;
  codeNaf: string;
  secteurActivite: string;
  adresseSiege: string;
  effectif: number;
}

interface UseInseeValidationResult {
  validateSiren: (siren: string) => Promise<InseeData | null>;
  isLoading: boolean;
  error: string | null;
}

// Note: The actual INSEE API requires authentication. 
// This simulates the API response for demonstration.
// In production, you would call a backend edge function that handles the INSEE API.
export function useInseeValidation(): UseInseeValidationResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateSiren = async (siren: string): Promise<InseeData | null> => {
    setIsLoading(true);
    setError(null);

    // Validate format first
    if (!/^\d{9}$/.test(siren)) {
      setError('Le SIREN doit contenir exactement 9 chiffres');
      setIsLoading(false);
      return null;
    }

    // Validate using Luhn algorithm (checksum)
    if (!isValidLuhn(siren)) {
      setError('SIREN invalide (contrôle de cohérence échoué)');
      setIsLoading(false);
      return null;
    }

    try {
      // In production, this would call a backend edge function
      // For now, we simulate with a delay and mock data
      await new Promise(resolve => setTimeout(resolve, 800));

      // Simulate API response based on SIREN
      // Some SIRENs return mock data, others return "not found"
      const mockData = getMockInseeData(siren);
      
      if (!mockData) {
        setError('Entreprise non trouvée dans la base INSEE');
        setIsLoading(false);
        return null;
      }

      setIsLoading(false);
      return mockData;
    } catch (err) {
      setError('Erreur lors de la validation INSEE');
      setIsLoading(false);
      return null;
    }
  };

  return { validateSiren, isLoading, error };
}

// Luhn algorithm for SIREN validation
function isValidLuhn(siren: string): boolean {
  let sum = 0;
  for (let i = 0; i < siren.length; i++) {
    let digit = parseInt(siren[i], 10);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

// Mock data for demonstration
function getMockInseeData(siren: string): InseeData | null {
  // Predefined mock responses
  const mockDatabase: Record<string, InseeData> = {
    '123456789': {
      siren: '123456789',
      siret: '12345678901234',
      raisonSociale: 'DUPONT BTP SARL',
      formeJuridique: 'SARL',
      dateCreation: '2018-03-15',
      codeNaf: '4120A',
      secteurActivite: 'Construction de maisons individuelles',
      adresseSiege: '15 rue de la Construction, 75012 Paris',
      effectif: 8,
    },
    '987654321': {
      siren: '987654321',
      siret: '98765432100014',
      raisonSociale: 'MARTIN RESTAURATION SAS',
      formeJuridique: 'SAS',
      dateCreation: '2020-09-01',
      codeNaf: '5610A',
      secteurActivite: 'Restauration traditionnelle',
      adresseSiege: '42 avenue des Gourmets, 69003 Lyon',
      effectif: 12,
    },
    '552032534': {
      siren: '552032534',
      siret: '55203253400050',
      raisonSociale: 'BNP PARIBAS',
      formeJuridique: 'SA',
      dateCreation: '1966-05-17',
      codeNaf: '6419Z',
      secteurActivite: 'Autres intermédiations monétaires',
      adresseSiege: '16 Boulevard des Italiens, 75009 Paris',
      effectif: 190000,
    },
    '443061841': {
      siren: '443061841',
      siret: '44306184100047',
      raisonSociale: 'FREE MOBILE',
      formeJuridique: 'SAS',
      dateCreation: '2007-07-26',
      codeNaf: '6120Z',
      secteurActivite: 'Télécommunications sans fil',
      adresseSiege: '16 rue de la Ville l\'Évêque, 75008 Paris',
      effectif: 3000,
    },
  };

  // Check if SIREN exists in mock database
  if (mockDatabase[siren]) {
    return mockDatabase[siren];
  }

  // For valid Luhn SIRENs not in database, generate mock data
  // This simulates "found" enterprises
  if (isValidLuhn(siren)) {
    // Generate random but consistent data based on SIREN
    const formes = ['SARL', 'SAS', 'EURL', 'SCI', 'SA'];
    const secteurs = [
      'Commerce de détail',
      'Services aux entreprises',
      'Construction',
      'Restauration',
      'Conseil',
    ];
    
    const hash = siren.split('').reduce((a, b) => a + parseInt(b), 0);
    
    return {
      siren,
      siret: siren + '00001',
      raisonSociale: `ENTREPRISE ${siren.substring(0, 4)}`,
      formeJuridique: formes[hash % formes.length],
      dateCreation: `20${10 + (hash % 14)}-${String((hash % 12) + 1).padStart(2, '0')}-01`,
      codeNaf: `${hash % 100}00A`,
      secteurActivite: secteurs[hash % secteurs.length],
      adresseSiege: `${hash % 200} rue du Commerce, ${75000 + (hash % 100)} Paris`,
      effectif: hash % 50,
    };
  }

  return null;
}

// NAF code descriptions (partial list)
export const nafDescriptions: Record<string, string> = {
  '4120A': 'Construction de maisons individuelles',
  '4120B': 'Construction d\'autres bâtiments',
  '5610A': 'Restauration traditionnelle',
  '5610B': 'Cafétérias et autres libre-services',
  '5610C': 'Restauration de type rapide',
  '6201Z': 'Programmation informatique',
  '6202A': 'Conseil en systèmes et logiciels informatiques',
  '6311Z': 'Traitement de données, hébergement et activités connexes',
  '6419Z': 'Autres intermédiations monétaires',
  '6499Z': 'Autres activités des services financiers',
  '6820A': 'Location de logements',
  '6820B': 'Location de terrains et d\'autres biens immobiliers',
  '7010Z': 'Activités des sièges sociaux',
  '7022Z': 'Conseil pour les affaires et autres conseils de gestion',
  '7111Z': 'Activités d\'architecture',
  '7112A': 'Activité des géomètres',
  '7112B': 'Ingénierie, études techniques',
  '7490B': 'Activités spécialisées, scientifiques et techniques diverses',
};

// Forme juridique descriptions
export const formeJuridiqueLabels: Record<string, string> = {
  'SARL': 'Société à responsabilité limitée',
  'SAS': 'Société par actions simplifiée',
  'SASU': 'Société par actions simplifiée unipersonnelle',
  'EURL': 'Entreprise unipersonnelle à responsabilité limitée',
  'SA': 'Société anonyme',
  'SCI': 'Société civile immobilière',
  'EI': 'Entreprise individuelle',
  'AUTO': 'Micro-entrepreneur / Auto-entrepreneur',
};

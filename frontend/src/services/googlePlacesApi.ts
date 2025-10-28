/**
 * Google Places API (New) Service
 * Provides autocomplete functionality for location search
 */

const GOOGLE_PLACES_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY || 'AIzaSyCjLqOEOTloPy-rc64jyoZDeKxW6RQ1AFs';
const GOOGLE_PLACES_API_URL = 'https://places.googleapis.com/v1/places:autocomplete';

export interface PlacePrediction {
  placeId: string;
  structuredFormat: {
    mainText: {
      text: string;
    };
    secondaryText?: {
      text: string;
    };
  };
  types: string[];
  text: {
    text: string;
  };
}

export interface PlacesAutocompleteResponse {
  suggestions: Array<{
    placePrediction: PlacePrediction;
  }>;
  error_message?: string;
  status?: string;
}

/**
 * Get location autocomplete predictions from Google Places API (New)
 * @param input - The user's input string
 * @returns Promise with array of location predictions
 */
export async function getLocationPredictions(input: string): Promise<PlacePrediction[]> {
  if (!input || input.trim().length < 2) {
    return [];
  }

  try {
    const response = await fetch(GOOGLE_PLACES_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
      },
      body: JSON.stringify({
        input: input.trim(),
        includedRegionCodes: ['US'],
      }),
    });

    const data: PlacesAutocompleteResponse = await response.json();

    if (data.suggestions && data.suggestions.length > 0) {
      // Extract predictions and filter for relevant location types
      const predictions = data.suggestions
        .map(s => s.placePrediction)
        .filter(prediction => {
          const types = prediction.types;
          // Filter for cities, postal codes, states, counties, neighborhoods
          return types.some(type => 
            ['locality', 'postal_code', 'administrative_area_level_1', 
             'administrative_area_level_2', 'neighborhood', 'sublocality'].includes(type)
          );
        });
      
      return predictions;
    }

    return [];
  } catch (error) {
    console.error('Error fetching location predictions:', error);
    return [];
  }
}

/**
 * Extract a clean location name from a prediction
 * Formats the prediction to a suitable format for the Yelp API
 */
export function formatLocationName(prediction: PlacePrediction): string {
  const { structuredFormat } = prediction;
  
  // For cities, use just the city name
  if (prediction.types.includes('locality')) {
    return structuredFormat.mainText.text;
  }
  
  // For postal codes, use the main text
  if (prediction.types.includes('postal_code')) {
    return structuredFormat.mainText.text;
  }
  
  // For states, use just the state name
  if (prediction.types.includes('administrative_area_level_1')) {
    return structuredFormat.mainText.text;
  }
  
  // For neighborhoods and sublocalities
  if (prediction.types.includes('neighborhood') || prediction.types.includes('sublocality')) {
    return structuredFormat.mainText.text;
  }
  
  // For counties (administrative_area_level_2)
  if (prediction.types.includes('administrative_area_level_2')) {
    // Remove "County" suffix if present
    const name = structuredFormat.mainText.text;
    return name.replace(/ County$/i, '') + ' County';
  }
  
  // Default: return main text
  return structuredFormat.mainText.text;
}

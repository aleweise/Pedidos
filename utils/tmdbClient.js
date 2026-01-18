
const TMDB_API_KEY = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI4ZWVkYjE5YjJhZjQ2YWMzMTFjZmQyZjY2MTNiMGFiOSIsIm5iZiI6MTc2NDU4MzUzMC43LCJzdWIiOiI2OTJkNjg2YTNmNjljN2I0NTZlMzM5ZWMiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.fsbaIV2draO5OLw9BXEc5HyEg-W5epj5DKZnrOyJDxw'; // Bearer Token
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w92';

async function searchMovies(query) {
    if (!query) return [];

    try {
        const response = await fetch(`${TMDB_BASE_URL}/search/movie?query=${encodeURIComponent(query)}&language=es-MX&page=1&include_adult=false`, {
            headers: {
                'Authorization': `Bearer ${TMDB_API_KEY}`,
                'accept': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Error fetching movies');

        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error('TMDB Search Error:', error);
        return [];
    }
}

// Export for use in script.js (if using modules) or global window object
window.searchMovies = searchMovies;
window.TMDB_IMAGE_BASE_URL = TMDB_IMAGE_BASE_URL;

import { useState, useEffect, useReducer } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient
} from '@tanstack/react-query';
import { z } from 'zod';

// =====================================
// Zod Schemas
// =====================================
const PaginationResponse = z.object({
  page: z.number(),
  itemsPerPage: z.number(),
  totalItems: z.number(),
  totalPages: z.number(),
});

enum CardType {
  Lorcana = "lorcana",
  MagicTheGathering = "magic_the_gathering"
}

enum LorcanaRarity {
  Common = "Common",
  Enchanted = "Enchanted",
  Legendary = "Legendary",
  Promo = "Promo",
  Rare = "Rare",
  SuperRare = "Super Rare",
  Uncommon = "Uncommon"
}

enum MagicTheGatheringColor {
  U = "U",
  B = "B",
  G = "G",
  R = "R",
  W = "W"
}

enum MagicTheGatheringCardRarity {
  Common = "common",
  Mythic = "mythic",
  Rare = "rare",
  Special = "special",
  Uncommon = "uncommon"
}

const baseCard = z.object({
  _id: z.string().optional(),
  name: z.string(),
  id: z.string(),
  imageUrl: z.string().optional(),
});

const LorcanaCard = baseCard.extend({
  type: z.literal(CardType.Lorcana),
  attributes: z.object({
    inkCost: z.number().min(0).max(10),
    rarity: z.nativeEnum(LorcanaRarity)
  })
});

const MagicTheGatheringCard = baseCard.extend({
  type: z.literal(CardType.MagicTheGathering),
  attributes: z.object({
    color: z.nativeEnum(MagicTheGatheringColor).optional(),
    rarity: z.nativeEnum(MagicTheGatheringCardRarity)
  })
});

const Card = z.union([LorcanaCard, MagicTheGatheringCard]);
type CardType = z.infer<typeof Card>;

const CardListResponse = z.object({
  items: z.array(Card),
  pagination: PaginationResponse
});

type CardListResponse = z.infer<typeof CardListResponse>;

// =====================================
// API Client
// =====================================
interface CardFilterParams {
  query?: string;
  type?: CardType;
  attrInkCost?: number[];
  attrRarity?: string[];
  attrColor?: MagicTheGatheringColor[];
  page: number;
  itemsPerPage: number;
}

const API_BASE_URL = import.meta.env.VITE_APP_API || 'http://localhost:3001';


const fetchCards = async (params: CardFilterParams): Promise<CardListResponse> => {
  const queryParams = new URLSearchParams();

  if (params.query) queryParams.append('query', params.query);
  if (params.type) queryParams.append('type', params.type);

  if (params.attrInkCost && params.attrInkCost.length > 0) {
    params.attrInkCost.forEach(cost =>
      queryParams.append('attrInkCost[]', cost.toString())
    );
  }

  if (params.attrRarity && params.attrRarity.length > 0) {
    params.attrRarity.forEach(rarity =>
      queryParams.append('attrRarity[]', rarity)
    );
  }

  if (params.attrColor && params.attrColor.length > 0) {
    params.attrColor.forEach(color =>
      queryParams.append('attrColor[]', color)
    );
  }

  queryParams.append('page', params.page.toString());
  queryParams.append('itemsPerPage', params.itemsPerPage.toString());

  const response = await fetch(`${API_BASE_URL}/api/cards?${queryParams.toString()}`);
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }

  const data = await response.json();
  return CardListResponse.parse(data);
};

// =====================================
// Action Types and Reducer
// =====================================
// Define action types as string literals
const SEARCH_QUERY = 'SEARCH_QUERY';
const SET_TYPE = 'SET_TYPE';
const TOGGLE_INK_COST = 'TOGGLE_INK_COST';
const TOGGLE_RARITY = 'TOGGLE_RARITY';
const TOGGLE_COLOR = 'TOGGLE_COLOR';
const LOAD_MORE = 'LOAD_MORE';
const RESET_FILTERS = 'RESET_FILTERS';
const SET_LOADING_MORE = 'SET_LOADING_MORE';

// Define action type interfaces
interface SearchQueryAction {
  type: typeof SEARCH_QUERY;
  payload: string;
}

interface SetTypeAction {
  type: typeof SET_TYPE;
  payload: CardType | undefined;
}

interface ToggleInkCostAction {
  type: typeof TOGGLE_INK_COST;
  payload: number;
}

interface ToggleRarityAction {
  type: typeof TOGGLE_RARITY;
  payload: string;
}

interface ToggleColorAction {
  type: typeof TOGGLE_COLOR;
  payload: MagicTheGatheringColor;
}

interface LoadMoreAction {
  type: typeof LOAD_MORE;
}

interface ResetFiltersAction {
  type: typeof RESET_FILTERS;
}

interface SetLoadingMoreAction {
  type: typeof SET_LOADING_MORE;
  payload: boolean;
}

// Union type for all possible actions
type FilterAction =
  | SearchQueryAction
  | SetTypeAction
  | ToggleInkCostAction
  | ToggleRarityAction
  | ToggleColorAction
  | LoadMoreAction
  | ResetFiltersAction
  | SetLoadingMoreAction;

// Define state interface
interface FilterState {
  query: string;
  type: CardType | undefined;
  attrInkCost: number[];
  attrRarity: string[];
  attrColor: MagicTheGatheringColor[];
  page: number;
  itemsPerPage: number;
  isLoadingMore: boolean;
  shouldRefetch: boolean;
}

// Define initial state
const initialFilterState: FilterState = {
  query: '',
  type: undefined,
  attrInkCost: [],
  attrRarity: [],
  attrColor: [],
  page: 1,
  itemsPerPage: 20,
  isLoadingMore: false,
  shouldRefetch: false
};

// Define reducer function with proper types
function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case SEARCH_QUERY:
      return {
        ...state,
        query: action.payload,
        page: 1,
        shouldRefetch: true
      };
    case SET_TYPE:
      return {
        ...state,
        type: action.payload,
        attrInkCost: [],
        attrRarity: [],
        attrColor: [],
        page: 1,
        shouldRefetch: true
      };
    case TOGGLE_INK_COST:
      const newInkCosts = state.attrInkCost.includes(action.payload)
        ? state.attrInkCost.filter(cost => cost !== action.payload)
        : [...state.attrInkCost, action.payload];
      return {
        ...state,
        attrInkCost: newInkCosts,
        page: 1,
        shouldRefetch: true
      };
    case TOGGLE_RARITY:
      const newRarities = state.attrRarity.includes(action.payload)
        ? state.attrRarity.filter(rarity => rarity !== action.payload)
        : [...state.attrRarity, action.payload];
      return {
        ...state,
        attrRarity: newRarities,
        page: 1,
        shouldRefetch: true
      };
    case TOGGLE_COLOR:
      const newColors = state.attrColor.includes(action.payload)
        ? state.attrColor.filter(color => color !== action.payload)
        : [...state.attrColor, action.payload];
      return {
        ...state,
        attrColor: newColors,
        page: 1,
        shouldRefetch: true
      };
    case LOAD_MORE:
      return {
        ...state,
        page: state.page + 1,
        isLoadingMore: true,
        shouldRefetch: true
      };
    case SET_LOADING_MORE:
      return {
        ...state,
        isLoadingMore: action.payload,
        shouldRefetch: false
      };
    case RESET_FILTERS:
      return {
        ...initialFilterState,
        shouldRefetch: true
      };
    default:
      return state;
  }
}

// =====================================
// Components
// =====================================

// Color Map for MTG Colors
const mtgColorMap = {
  [MagicTheGatheringColor.U]: { label: 'Blue', color: 'bg-blue-500' },
  [MagicTheGatheringColor.B]: { label: 'Black', color: 'bg-gray-800' },
  [MagicTheGatheringColor.G]: { label: 'Green', color: 'bg-green-600' },
  [MagicTheGatheringColor.R]: { label: 'Red', color: 'bg-red-600' },
  [MagicTheGatheringColor.W]: { label: 'White', color: 'bg-yellow-200' },
};

// Sidebar Component
const Sidebar = ({
                   state,
                   dispatch
                 }: {
  state: FilterState;
  dispatch: React.Dispatch<FilterAction>
}) => {
  return (
    <div className="w-64 bg-gray-900 text-white p-4 min-h-screen">
      <h2 className="text-xl font-bold mb-6 border-b border-purple-500 pb-2">Card Filters</h2>

      {/* Card Type Selection */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Card Type</h3>
        <select
          className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
          value={state.type || ""}
          onChange={(e) => {
            const newType = e.target.value ? e.target.value as CardType : undefined;
            dispatch({ type: SET_TYPE, payload: newType } as SetTypeAction);
          }}
        >
          <option value="">All Types</option>
          <option value={CardType.Lorcana}>Lorcana</option>
          <option value={CardType.MagicTheGathering}>Magic: The Gathering</option>
        </select>
      </div>

      {/* Lorcana: Ink Cost Filter */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Lorcana Ink Cost</h3>
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 11 }, (_, i) => i).map(cost => (
            <button
              key={cost}
              className={`p-2 rounded text-center font-bold ${
                state.attrInkCost?.includes(cost)
                  ? 'bg-purple-600'
                  : 'bg-gray-700 hover:bg-gray-600'
              } ${state.type !== undefined && state.type !== CardType.Lorcana ? 'opacity-50' : ''}`}
              onClick={() => {
                if (state.type === undefined || state.type === CardType.Lorcana) {
                  dispatch({ type: TOGGLE_INK_COST, payload: cost } as ToggleInkCostAction);
                }
              }}
              disabled={state.type !== undefined && state.type !== CardType.Lorcana}
            >
              {cost}
            </button>
          ))}
        </div>
        {state.type !== undefined && state.type !== CardType.Lorcana && (
          <p className="text-xs text-gray-400 mt-1">Select Lorcana to use this filter</p>
        )}
      </div>

      {/* Lorcana: Rarity Filter */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Lorcana Rarity</h3>
        {Object.values(LorcanaRarity).map(rarity => (
          <div key={rarity} className="flex items-center my-1">
            <input
              id={`lorcana-${rarity}`}
              type="checkbox"
              className="mr-2 h-4 w-4 accent-purple-600"
              checked={state.attrRarity?.includes(rarity) || false}
              onChange={() => {
                if (state.type === undefined || state.type === CardType.Lorcana) {
                  dispatch({ type: TOGGLE_RARITY, payload: rarity } as ToggleRarityAction);
                }
              }}
              disabled={state.type !== undefined && state.type !== CardType.Lorcana}
            />
            <label
              htmlFor={`lorcana-${rarity}`}
              className={`text-sm ${state.type !== undefined && state.type !== CardType.Lorcana ? 'text-gray-500' : ''}`}
            >
              {rarity}
            </label>
          </div>
        ))}
        {state.type !== undefined && state.type !== CardType.Lorcana && (
          <p className="text-xs text-gray-400 mt-1">Select Lorcana to use this filter</p>
        )}
      </div>

      {/* MTG: Color Filter */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">MTG Colors</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(mtgColorMap).map(([color, { label, color: bgColor }]) => (
            <button
              key={color}
              className={`p-2 rounded-full w-8 h-8 flex items-center justify-center ${bgColor} ${
                state.attrColor?.includes(color as MagicTheGatheringColor)
                  ? 'ring-2 ring-yellow-400'
                  : ''
              } ${state.type !== undefined && state.type !== CardType.MagicTheGathering ? 'opacity-50' : ''}`}
              title={label}
              onClick={() => {
                if (state.type === undefined || state.type === CardType.MagicTheGathering) {
                  dispatch({ type: TOGGLE_COLOR, payload: color as MagicTheGatheringColor } as ToggleColorAction);
                }
              }}
              disabled={state.type !== undefined && state.type !== CardType.MagicTheGathering}
            >
              {color}
            </button>
          ))}
        </div>
        {state.type !== undefined && state.type !== CardType.MagicTheGathering && (
          <p className="text-xs text-gray-400 mt-1">Select Magic: The Gathering to use this filter</p>
        )}
      </div>

      {/* MTG: Rarity Filter */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">MTG Rarity</h3>
        {Object.values(MagicTheGatheringCardRarity).map(rarity => (
          <div key={rarity} className="flex items-center my-1">
            <input
              id={`mtg-${rarity}`}
              type="checkbox"
              className="mr-2 h-4 w-4 accent-purple-600"
              checked={state.attrRarity?.includes(rarity) || false}
              onChange={() => {
                if (state.type === undefined || state.type === CardType.MagicTheGathering) {
                  dispatch({ type: TOGGLE_RARITY, payload: rarity } as ToggleRarityAction);
                }
              }}
              disabled={state.type !== undefined && state.type !== CardType.MagicTheGathering}
            />
            <label
              htmlFor={`mtg-${rarity}`}
              className={`text-sm capitalize ${state.type !== undefined && state.type !== CardType.MagicTheGathering ? 'text-gray-500' : ''}`}
            >
              {rarity.replace('_', ' ')}
            </label>
          </div>
        ))}
        {state.type !== undefined && state.type !== CardType.MagicTheGathering && (
          <p className="text-xs text-gray-400 mt-1">Select Magic: The Gathering to use this filter</p>
        )}
      </div>

      {/* Reset Filters Button */}
      <button
        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
        onClick={() => dispatch({ type: RESET_FILTERS } as ResetFiltersAction)}
      >
        Reset Filters
      </button>
    </div>
  );
};

const CardItem = ({ card }: { card: z.infer<typeof Card> }) => {
  const { type, name, imageUrl = "" } = card;
  const { color, rarity, inkCost } = card.attributes || {};
  const [imgError, setImgError] = useState(false);

  // Determine styles based on card properties
  let cardBgClass = 'bg-gray-800';
  let rarityBgClass = 'bg-gray-600';

  // Set rarity badge color for Lorcana
  if (type === CardType.Lorcana && rarity) {
    const lorcanaRarityColors = {
      [LorcanaRarity.Common]: 'bg-gray-500',
      [LorcanaRarity.Uncommon]: 'bg-blue-500',
      [LorcanaRarity.Rare]: 'bg-yellow-500',
      [LorcanaRarity.SuperRare]: 'bg-pink-500',
      [LorcanaRarity.Legendary]: 'bg-purple-500',
      [LorcanaRarity.Enchanted]: 'bg-teal-500',
      [LorcanaRarity.Promo]: 'bg-red-500'
    };
    rarityBgClass = lorcanaRarityColors[rarity] || rarityBgClass;
  }
  // Set rarity badge color for MTG
  else if (type === CardType.MagicTheGathering && rarity) {
    const mtgRarityColors = {
      [MagicTheGatheringCardRarity.Common]: 'bg-gray-500',
      [MagicTheGatheringCardRarity.Uncommon]: 'bg-blue-500',
      [MagicTheGatheringCardRarity.Rare]: 'bg-yellow-500',
      [MagicTheGatheringCardRarity.Mythic]: 'bg-orange-500',
      [MagicTheGatheringCardRarity.Special]: 'bg-purple-500'
    };
    rarityBgClass = mtgRarityColors[rarity] || rarityBgClass;
  }

  // Format rarity text
  const formattedRarity = type === CardType.Lorcana
    ? rarity
    : (rarity ? rarity.charAt(0).toUpperCase() + rarity.slice(1) : '');

  return (
    <div className={`w-64 rounded-lg overflow-hidden shadow-lg ${cardBgClass}`}>
      {/* Card image section - With error handling for images */}
      {imageUrl && !imgError ? (
        <div className="h-64 bg-gray-700 flex justify-center items-center">
          <img
            src={imageUrl}
            alt={name}
            className="h-full w-full object-contain"
            onError={() => setImgError(true)}
          />
        </div>
      ) : (
        <div
          className="h-64 bg-gray-600 flex justify-center items-center"
          aria-label="No image available"
        >
          <span className="text-gray-300">{name}</span>
        </div>
      )}

      {/* Card info section */}
      <div className="p-4 text-white">
        {/* Card name */}
        <h3 className="font-bold text-base mb-2">{name}</h3>

        {/* Card type */}
        <div className="mb-2">
          <span className="bg-gray-700 px-2 py-1 rounded text-sm">{type}</span>
        </div>

        {/* Card rarity */}
        <div className="mb-2">
          <span className="text-sm mr-2">Rarity:</span>
          <span className={`text-sm px-2 py-1 rounded ${rarityBgClass}`}>
            {formattedRarity}
          </span>
        </div>

        {/* Card color (MTG) */}
        {type === CardType.MagicTheGathering && color && (
          <div className="mb-2">
            <span className="text-sm mr-2">Color:</span>
            <span className={`text-sm px-2 py-1 rounded ${mtgColorMap[color].color}`}>
              {color}
            </span>
          </div>
        )}

        {/* Ink cost (Lorcana) */}
        {type === CardType.Lorcana && inkCost && (
          <div className="mb-2">
            <span className="text-sm mr-2">Ink Cost:</span>
            <span className="text-sm px-2 py-1 rounded bg-blue-600">
              {inkCost}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// Main component
const CardCollectionApp = () => {
  const [searchInput, setSearchInput] = useState('');
  const [allCards, setAllCards] = useState([]);
  const [state, dispatch] = useReducer(filterReducer, initialFilterState);
  const queryClient = useQueryClient();

  // Create filter params object for the query
  const filterParams = {
    query: state.query,
    type: state.type,
    attrInkCost: state.attrInkCost,
    attrRarity: state.attrRarity,
    attrColor: state.attrColor,
    page: state.page,
    itemsPerPage: state.itemsPerPage
  };

  // Fetch cards with the current filters
  const {
    data,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['cards', filterParams],
    queryFn: () => fetchCards(filterParams),
    enabled: true, // Query will always execute automatically
  });

  // Update card data when query results arrive
  useEffect(() => {
    if (data) {
      if (state.page === 1) {
        // First page - replace all cards
        setAllCards(data.items);
      } else if (state.isLoadingMore) {
        // Additional pages - append to existing cards
        setAllCards(prev => [...prev, ...data.items]);
        dispatch({ type: SET_LOADING_MORE, payload: false } as SetLoadingMoreAction);
      }
    }
  }, [data, state.page, state.isLoadingMore]);

  // Handle filter changes that should trigger a refetch
  useEffect(() => {
    if (state.shouldRefetch) {
      void refetch();
    }
  }, [state.shouldRefetch, refetch]);

  // Handle search input
  const handleSearch = (e) => {
    e.preventDefault();
    dispatch({ type: SEARCH_QUERY, payload: searchInput } as SearchQueryAction);
  };

  // Load more cards
  const loadMore = () => {
    if (data && data.pagination.page < data.pagination.totalPages) {
      dispatch({ type: LOAD_MORE } as LoadMoreAction);
    }
  };

  // Generate card grid
  const renderCardGrid = () => {
    if (isLoading && state.page === 1) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      );
    }

    if (isError) {
      console.error(error);
      return (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>Error loading cards: {error || 'Unknown error'}</p>
        </div>
      );
    }

    if (!allCards || allCards.length === 0) {
      return (
        <div className="text-center text-gray-300 py-16">
          <h3 className="text-2xl mb-2">No cards found</h3>
          <p>Try adjusting your filters or search terms</p>
        </div>
      );
    }

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {allCards.map(card => (
            <div key={`${card.id}-${card.name}`}>
              <CardItem card={card} />
            </div>
          ))}
        </div>

        {data && data.pagination.page < data.pagination.totalPages && (
          <div className="flex justify-center mt-8">
            <button
              onClick={loadMore}
              disabled={state.isLoadingMore}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transform transition hover:scale-105"
            >
              {state.isLoadingMore ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </span>
              ) : (
                "Load More Cards"
              )}
            </button>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-800 text-white">
      <Sidebar state={state} dispatch={dispatch} />

      <div className="flex-1 p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">
            Card Collection
          </h1>
          <p className="text-gray-400">
            Explore your favorite cards from Lorcana and Magic: The Gathering
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative">
            <input
              type="text"
              className="w-full bg-gray-700 border border-gray-600 rounded-full py-3 px-6 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Search cards by name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button
              type="submit"
              className="absolute right-2 top-2 bg-purple-600 hover:bg-purple-700 rounded-full p-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </form>

        {/* Stats and Filters Summary */}
        <div className="flex justify-between items-center mb-6">
          <div>
            {data && (
              <span className="text-gray-400">
                Showing <span className="font-bold text-white">{allCards.length}</span> of{' '}
                <span className="font-bold text-white">{data.pagination.totalItems}</span> cards
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {state.type && (
              <span className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full">
                {state.type}
              </span>
            )}
            {state.query && (
              <span className="bg-green-600 text-white text-xs px-3 py-1 rounded-full">
                "{state.query}"
              </span>
            )}
            {state.attrInkCost && state.attrInkCost.length > 0 && (
              <span className="bg-yellow-600 text-white text-xs px-3 py-1 rounded-full">
                Ink: {state.attrInkCost.join(', ')}
              </span>
            )}
            {state.attrRarity && state.attrRarity.length > 0 && (
              <span className="bg-pink-600 text-white text-xs px-3 py-1 rounded-full">
                Rarity: {state.attrRarity.length}
              </span>
            )}
            {state.attrColor && state.attrColor.length > 0 && (
              <span className="bg-teal-600 text-white text-xs px-3 py-1 rounded-full">
                Colors: {state.attrColor.join(', ')}
              </span>
            )}
          </div>
        </div>

        {/* Card Grid */}
        {renderCardGrid()}
      </div>
    </div>
  );
};

// Create a QueryClient and set up the provider
const queryClient = new QueryClient();

// Main App export
const App = () => (
  <QueryClientProvider client={queryClient}>
    <CardCollectionApp />
  </QueryClientProvider>
);

export default App;

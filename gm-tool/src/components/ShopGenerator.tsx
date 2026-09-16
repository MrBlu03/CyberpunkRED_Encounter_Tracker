import { useState, useMemo } from 'react';
import { 
  ShoppingCart, Search, Filter, RefreshCw, Package, Tag, 
  ShoppingBag, X, Plus, Minus, Trash2, Dices, Sparkles, 
  FileText, LayoutPanelTop, Store, Percent, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { rollDiceDetailed } from '@/lib/dice';
import { rollD10Exploding } from '@/lib/combatEngine';
import foundryItemsRaw from '@/data/foundryItems.json';
import type { CritMode, TarotDeckState } from '@/types';

// Foundry VTT format item interface
export interface FVTTItem {
  _id: string;
  name: string;
  type: 'weapon' | 'armor' | 'cyberware' | 'gear' | 'drug' | 'ammo' | 'clothing' | 'itemUpgrade' | 'vehicle';
  system: {
    price?: { market: number };
    cost?: number;
    value?: number;
    quality?: 'poor' | 'standard' | 'excellent' | string;
    category?: string;
    brand?: string;
    source?: { book: string; page: number };
    description?: { value: string };
    damage?: string;
    weaponType?: string;
    bodyLocation?: { sp: number };
    headLocation?: { sp: number };
    armorType?: string;
    penalty?: number;
    attackmod?: number;
    rof?: number;
    magazine?: { max: number };
    weaponSkill?: string;
    hlCost?: number | { roll?: string; static?: number };
    slots?: number;
    install?: string;
    isRanged?: boolean;
    [key: string]: unknown;
  };
  img?: string;
}

interface CartItem extends FVTTItem {
  quantity: number;
}

interface Vendor {
  name: string;
  type: 'weapons' | 'armor' | 'clothing' | 'general' | 'ripper-doc' | 'tech' | 'black-market' | 'dealership';
  location: 'city-center' | 'corpo-plaza' | 'watson' | 'westbrook' | 'santo-domingo' | 'pacifica' | 'badlands';
  description: string;
  specialties: string[];
  markup: number;
  availability: number;
}

interface NightMarketVenue {
  id: string;
  name: string;
  district: string;
  atmosphere: string;
  security: string;
}

interface NightMarketStall {
  id: string;
  name: string;
  stallType: 'weapons' | 'cyberware' | 'armor' | 'tech' | 'pharma' | 'fashion' | 'vehicles';
  vendorName: string;
  tagline: string;
  categories: string[];
}

const VENDOR_TYPES: Record<string, { name: string; specialties: string[]; markup: number }> = {
  'weapons': { name: 'Gun Shop', specialties: ['weapon'], markup: 1.1 },
  'armor': { name: 'Armor Shop', specialties: ['armor'], markup: 1.2 },
  'clothing': { name: 'Clothing Store', specialties: ['clothing'], markup: 1.0 },
  'general': { name: 'General Store', specialties: ['gear', 'ammo', 'drug'], markup: 1.3 },
  'ripper-doc': { name: 'Ripperdoc', specialties: ['cyberware'], markup: 1.5 },
  'tech': { name: 'Tech Shop', specialties: ['gear', 'cyberware'], markup: 1.4 },
  'black-market': { name: 'Black Market', specialties: ['weapon', 'cyberware', 'drug', 'armor'], markup: 2.0 },
  'dealership': { name: 'Vehicle Dealership', specialties: ['vehicle'], markup: 1.2 }
};

const LOCATIONS: Record<string, { name: string; description: string; qualityBonus: number }> = {
  'city-center': { name: 'City Center', description: 'High-end corporate district', qualityBonus: 0.3 },
  'corpo-plaza': { name: 'Corpo Plaza', description: 'Ultra-luxury corporate zone', qualityBonus: 0.5 },
  'watson': { name: 'Watson', description: 'Industrial immigrant district', qualityBonus: -0.2 },
  'westbrook': { name: 'Westbrook', description: 'Entertainment and luxury district', qualityBonus: 0.2 },
  'santo-domingo': { name: 'Santo Domingo', description: 'Manufacturing and working class', qualityBonus: -0.1 },
  'pacifica': { name: 'Pacifica', description: 'Abandoned combat zone', qualityBonus: -0.3 },
  'badlands': { name: 'Badlands', description: 'Nomad territory outside the city', qualityBonus: -0.4 }
};

// Cyberpunk RED RAW Night Market Venues
const NIGHT_MARKET_VENUES: NightMarketVenue[] = [
  {
    id: 'docks',
    name: 'South NC Cargo Superfreighter "Black Marlin"',
    district: 'Morro Bay Shipping',
    atmosphere: 'Flooded with sodium worklights, smell of saltwater and ozone, guarded by hardened Nomads.',
    security: 'High (Armed Nomad sentries on crane perches)'
  },
  {
    id: 'subway',
    name: 'Disused 4th Street Metro Concourse',
    district: 'Old Downtown',
    atmosphere: 'Flickering holographic billboards, spraypaint murals, echoing bass from a hidden generator.',
    security: 'Medium (Street solo lookouts at stairwells)'
  },
  {
    id: 'megabuilding',
    name: 'Condemned Megabuilding 04 Service Atrium',
    district: 'Watson',
    atmosphere: 'Sprawling indoor stalls across rusted catwalks, neon noodle carts and battery recharge depots.',
    security: 'Heavy (Bouncer solos with heavy weapons)'
  },
  {
    id: 'parking',
    name: 'Sub-Basement B3 Parking Vault',
    district: 'Little Europe / Glen',
    atmosphere: 'Reinforced blast doors, retrofitted shipping crates as vendor booths, discreet corporate techies.',
    security: 'Extreme (Automated sentry turrets and cyberdog patrols)'
  },
  {
    id: 'badlands',
    name: 'Dust Devil Nomad Convoy Perimeter Ring',
    district: 'Badlands Border',
    atmosphere: 'Circle of armored panzer-trucks, bonfires in 55-gallon drums, acoustic folk-metal and cheap synth-beer.',
    security: 'Military-Grade (Snipers and modified armed gyrocopters)'
  }
];

// Cyberpunk RED RAW Night Market Stalls
const NIGHT_MARKET_STALL_TEMPLATES: Omit<NightMarketStall, 'id'>[] = [
  {
    name: 'Iron & Chrome Armory',
    stallType: 'weapons',
    vendorName: 'Major "Dead-Eye" Vance (Ex-Militech Solo)',
    tagline: 'Military surplus assault rifles, silenced submachine guns, and high-caliber stopping power.',
    categories: ['weapon', 'ammo']
  },
  {
    name: 'The Chop-Shop Bodyshop',
    stallType: 'cyberware',
    vendorName: 'Dr. Tessa "Scalpel" Lin',
    tagline: 'Military-spec reflex speedware, subdermal plating, targeting optics, and combat cyberlimbs.',
    categories: ['cyberware']
  },
  {
    name: 'Aegis Hardened Defense',
    stallType: 'armor',
    vendorName: 'Sgt. Boris Ramos',
    tagline: 'Ballistic body armor, Kevlar inserts, bulletproof shields, and tactical headgear.',
    categories: ['armor']
  },
  {
    name: 'Deckhead Black-Silicon Bazaar',
    stallType: 'tech',
    vendorName: 'Cipher (Rogue Netrunner)',
    tagline: 'High-end cyberdecks, tactical bug sweepers, encrypted agents, and deep-net access gear.',
    categories: ['gear']
  },
  {
    name: 'The Chemical Carnival',
    stallType: 'pharma',
    vendorName: 'Hex (Street Chemist)',
    tagline: 'Combat stimulants, Speedheal ampoules, trauma stabilizers, and experimental synth-chems.',
    categories: ['drug']
  },
  {
    name: 'Chic & Armored Wardrobe',
    stallType: 'fashion',
    vendorName: 'Madame Valerie (High-End Fence)',
    tagline: 'Armor-woven designer jackets, mirror-tinted shades, and high-fashion chrome accessories.',
    categories: ['clothing']
  },
  {
    name: 'Nomad Salvage & Motorworks',
    stallType: 'vehicles',
    vendorName: 'Dusty Jack (Aldecaldo Mechanic)',
    tagline: 'Armored groundcars, modified superbikes, AV parts, and heavy vehicular upgrades.',
    categories: ['vehicle', 'itemUpgrade']
  }
];

// Initial extraction of all authentic items from foundryItems.json
const ALL_FOUNDRY_SHOP_ITEMS: FVTTItem[] = (() => {
  const rawList = foundryItemsRaw as unknown as FVTTItem[];
  const seen = new Set<string>();
  const validTypes = new Set(['weapon', 'armor', 'cyberware', 'gear', 'drug', 'ammo', 'clothing', 'itemUpgrade', 'vehicle']);
  
  return rawList.filter(item => {
    if (!item || !item._id || !item.name || !item.type) return false;
    if (seen.has(item._id)) return false;
    seen.add(item._id);
    return validTypes.has(item.type);
  });
})();

interface ShopGeneratorProps {
  critMode?: CritMode;
  tarotDeck?: TarotDeckState;
}

export function ShopGenerator({ critMode = 'raw', tarotDeck }: ShopGeneratorProps) {
  const [allItems] = useState<FVTTItem[]>(ALL_FOUNDRY_SHOP_ITEMS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentVendor, setCurrentVendor] = useState<Vendor | null>(null);
  const [showCart, setShowCart] = useState(false);
  
  // Night Market state
  const [nightMarketMode, setNightMarketMode] = useState(false);
  const [activeVenue, setActiveVenue] = useState<NightMarketVenue | null>(null);
  const [activeStalls, setActiveStalls] = useState<NightMarketStall[]>([]);
  const [selectedStallId, setSelectedStallId] = useState<string>('all');
  
  // Haggling state
  const [showHaggleModal, setShowHaggleModal] = useState(false);
  const [tradingSkillBase, setTradingSkillBase] = useState<number>(14);
  const [merchantDV, setMerchantDV] = useState<number>(15);
  const [haggleResult, setHaggleResult] = useState<{
    roll: number;
    skill: number;
    total: number;
    dv: number;
    margin: number;
    success: boolean;
    discount: number;
    message: string;
  } | null>(null);
  const [appliedCartDiscount, setAppliedCartDiscount] = useState<number>(0);

  const [filters, setFilters] = useState({
    type: 'all',
    priceRange: 'all',
    quality: 'all',
    search: '',
    sortBy: 'name',
    sortOrder: 'asc' as 'asc' | 'desc',
    hideZeroPrice: true,
    operatorTier: 'all'
  });

  // Roll a new Night Market with random venue and 2-4 stalls
  const rollNightMarket = () => {
    const venue = NIGHT_MARKET_VENUES[Math.floor(Math.random() * NIGHT_MARKET_VENUES.length)];
    // Pick 3 or 4 random stalls
    const shuffled = [...NIGHT_MARKET_STALL_TEMPLATES].sort(() => 0.5 - Math.random());
    const count = Math.random() > 0.4 ? 4 : 3;
    const stalls: NightMarketStall[] = shuffled.slice(0, count).map(st => ({
      ...st,
      id: crypto.randomUUID()
    }));

    setActiveVenue(venue);
    setActiveStalls(stalls);
    setSelectedStallId('all');
    setNightMarketMode(true);
    setCurrentVendor(null);
    toast.success(`Night Market rolled: ${venue.name} (${stalls.length} Stalls Open)`);
  };

  // Helper function to extract price from item
  const getItemPrice = (item: FVTTItem): number => {
    let price = item.system?.price?.market ?? item.system?.cost ?? item.system?.value ?? 0;
    if (currentVendor) {
      price = Math.round(price * currentVendor.markup);
    }
    return price;
  };

  // RAW Fixer Operator Rank Requirement for items by cost
  const getFixerOperatorRank = (price: number): { rank: number; label: string; badgeColor: string } => {
    if (price <= 100) return { rank: 0, label: 'Everyday (Any Store)', badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
    if (price <= 500) return { rank: 1, label: 'Costly (Operator 1+)', badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' };
    if (price <= 1000) return { rank: 4, label: 'Premium (Operator 4+)', badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
    if (price <= 5000) return { rank: 7, label: 'Expensive (Operator 7+)', badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
    if (price <= 10000) return { rank: 8, label: 'Very Exp. (Operator 8+)', badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
    return { rank: 9, label: 'Luxury (Operator 9+)', badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30' };
  };

  // Seeded random number generator for deterministic filtering
  const seededRandom = (seedStr: string): number => {
    let seed = 0;
    for (let i = 0; i < seedStr.length; i++) {
      seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
    }
    seed = (1103515245 * seed + 12345) % 0x80000000;
    return seed / 0x80000000;
  };

  // Filtered items
  const filteredItems = useMemo(() => {
    let filtered = [...allItems];

    // Night Market Stall Filtering
    if (nightMarketMode && activeStalls.length > 0) {
      if (selectedStallId !== 'all') {
        const stall = activeStalls.find(s => s.id === selectedStallId);
        if (stall) {
          filtered = filtered.filter(item => stall.categories.includes(item.type));
        }
      } else {
        const allStallCategories = new Set(activeStalls.flatMap(s => s.categories));
        filtered = filtered.filter(item => allStallCategories.has(item.type));
      }
    }

    // Type filter
    if (filters.type !== 'all') {
      if (filters.type.startsWith('vehicle-')) {
        const vType = filters.type.replace('vehicle-', '');
        filtered = filtered.filter(item => {
          if (item.type !== 'vehicle') return false;
          if (item.system?.category === vType) return true;
          
          const searchStr = `${item.name} ${item.system?.description?.value || ''}`.toLowerCase();
          switch (vType) {
            case 'car':
              return searchStr.includes('groundcar') || searchStr.includes('car') || searchStr.includes('van') || searchStr.includes('truck');
            case 'motorcycle':
              return searchStr.includes('motorcycle') || searchStr.includes('bike') || searchStr.includes('trike') || searchStr.includes('bicycle');
            case 'air':
              return searchStr.includes('av-') || searchStr.includes('av ') || searchStr.includes('helicopter') || searchStr.includes('aerodyne') || searchStr.includes('gyrocopter') || searchStr.includes('air');
            case 'water':
              return searchStr.includes('watercraft') || searchStr.includes('boat') || searchStr.includes('yacht') || searchStr.includes('seaskiff') || searchStr.includes('submarine') || searchStr.includes('jet ski');
            default:
              return false;
          }
        });
      } else {
        filtered = filtered.filter(item => item.type === filters.type);
      }
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchLower) ||
        item.system.category?.toLowerCase().includes(searchLower) ||
        item.system.brand?.toLowerCase().includes(searchLower)
      );
    }

    // Operator tier filter
    if (filters.operatorTier !== 'all') {
      const targetRank = parseInt(filters.operatorTier, 10);
      filtered = filtered.filter(item => {
        const p = getItemPrice(item);
        const req = getFixerOperatorRank(p);
        return req.rank <= targetRank;
      });
    }
    
    // Price range filter
    if (filters.priceRange !== 'all') {
      filtered = filtered.filter(item => {
        const price = getItemPrice(item);
        switch (filters.priceRange) {
          case 'cheap': return price <= 100;
          case 'budget': return price > 100 && price <= 500;
          case 'standard': return price > 500 && price <= 2000;
          case 'expensive': return price > 2000 && price <= 10000;
          case 'luxury': return price > 10000;
          default: return true;
        }
      });
    }
    
    // Hide €$0 items if selected
    if (filters.hideZeroPrice) {
      filtered = filtered.filter(item => (getItemPrice(item) || 0) > 0);
    }
    
    // Quality filter
    if (filters.quality !== 'all') {
      filtered = filtered.filter(item => (item.system.quality || 'standard').toLowerCase() === filters.quality.toLowerCase());
    }
    
    // Vendor filter
    if (currentVendor) {
      filtered = filtered.filter(item => {
        const matchesSpecialty = currentVendor.specialties.includes(item.type);
        const availabilityRoll = seededRandom(`vendor-${currentVendor.name}-${item._id}`);
        return matchesSpecialty && availabilityRoll < currentVendor.availability;
      });
    }
    
    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (filters.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'price':
          comparison = getItemPrice(a) - getItemPrice(b);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
      }
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  }, [allItems, filters, nightMarketMode, activeStalls, selectedStallId, currentVendor]);
  
  // Clickable Dice Component
  const ClickableDice = ({ notation }: { notation: string }) => {
    const handleRoll = () => {
      const result = rollDiceDetailed(notation);
      const critCount = result.rolls.filter(r => r === 6).length;
      const isCritical = critCount >= 2;
      const isTarotCrit = critMode === 'tarot' && critCount >= 3;
      
      if (isTarotCrit) {
        if (tarotDeck?.drawnThisSession) {
          toast.success(`🎲 CRITICAL! Rolled ${critCount} sixes! (Tarot limit reached - use RAW crit)`, {
            icon: <Sparkles className="w-5 h-5 text-warning" />
          });
        } else {
          toast.success(`🎴 NIGHT CITY TAROT! Rolled ${critCount} sixes! Draw a card!`, {
            icon: <LayoutPanelTop className="w-5 h-5 text-primary" />,
            duration: 10000
          });
        }
      } else if (isCritical) {
        toast.success(`🎲 CRITICAL! Rolled ${critCount} sixes! (+5 damage)`, {
          icon: <Sparkles className="w-5 h-5 text-warning" />
        });
      } else {
        toast.success(`Rolled ${notation}: ${result.total}`);
      }
    };
    
    return (
      <button 
        onClick={handleRoll}
        className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary hover:bg-primary/20 hover:text-primary rounded font-mono text-xs transition-colors cursor-pointer"
        title="Click to roll damage"
      >
        <Dices className="w-3 h-3" />
        {notation}
      </button>
    );
  };

  const generateRandomVendor = () => {
    const vendorTypes = Object.keys(VENDOR_TYPES);
    const locations = Object.keys(LOCATIONS);
    
    const type = vendorTypes[Math.floor(Math.random() * vendorTypes.length)];
    const location = locations[Math.floor(Math.random() * locations.length)];
    const vendorType = VENDOR_TYPES[type];
    const locData = LOCATIONS[location];
    
    const newVendor: Vendor = {
      name: `${locData.name} ${vendorType.name}`,
      type: type as Vendor['type'],
      location: location as Vendor['location'],
      description: locData.description,
      specialties: vendorType.specialties,
      markup: vendorType.markup,
      availability: 0.5 + Math.random() * 0.5
    };
    
    setCurrentVendor(newVendor);
    setNightMarketMode(false);
    toast.success(`Generated vendor: ${newVendor.name}`);
  };
  
  const addToCart = (item: FVTTItem) => {
    setCart(prev => {
      const existing = prev.find(i => i._id === item._id);
      if (existing) {
        return prev.map(i => i._id === item._id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    toast.success(`Added ${item.name} to cart`);
  };
  
  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(i => i._id !== itemId));
  };
  
  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item._id === itemId) {
        const newQuantity = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };
  
  const getCartSubtotal = () => {
    return cart.reduce((total, item) => total + getItemPrice(item) * item.quantity, 0);
  };

  const getCartTotal = () => {
    const subtotal = getCartSubtotal();
    if (appliedCartDiscount !== 0) {
      return Math.max(0, Math.round(subtotal * (1 - appliedCartDiscount)));
    }
    return subtotal;
  };
  
  const clearCart = () => {
    setCart([]);
    setAppliedCartDiscount(0);
    toast.info('Cart cleared');
  };

  // Perform Haggling Check using 1d10 Exploding + Trading Skill vs Merchant DV
  const handleRollHaggle = () => {
    const d10Result = rollD10Exploding();
    const total = d10Result.total + tradingSkillBase;
    const margin = total - merchantDV;
    const success = margin >= 0;

    let discount = 0;
    let message = '';

    if (d10Result.botch !== undefined && margin < -5) {
      discount = -0.10; // 10% surcharge
      message = `Critical Fumble! (${d10Result.breakdown}). The merchant took offense at your lowball offer and added a +10% insult surcharge!`;
    } else if (margin >= 5) {
      discount = 0.20; // 20% discount
      message = `Critical Success! Beat DV by ${margin} (Rolled ${d10Result.total} + ${tradingSkillBase} = ${total} vs DV ${merchantDV}). Secured a 20% Master Negotiator discount!`;
    } else if (success) {
      discount = 0.10; // 10% discount
      message = `Success! Beat DV by ${margin} (Total ${total} vs DV ${merchantDV}). Vendor agreed to a 10% street discount!`;
    } else {
      discount = 0;
      message = `Haggling Failed. Rolled ${total} vs DV ${merchantDV} (Missed by ${Math.abs(margin)}). The vendor refuses to budge on price.`;
    }

    setHaggleResult({
      roll: d10Result.total,
      skill: tradingSkillBase,
      total,
      dv: merchantDV,
      margin,
      success,
      discount,
      message
    });
  };

  const applyHaggleToCart = () => {
    if (!haggleResult) return;
    setAppliedCartDiscount(haggleResult.discount);
    setShowHaggleModal(false);
    if (haggleResult.discount > 0) {
      toast.success(`${(haggleResult.discount * 100).toFixed(0)}% discount applied to cart!`);
    } else if (haggleResult.discount < 0) {
      toast.error(`10% surcharge applied to cart!`);
    } else {
      toast.info('No price adjustment applied.');
    }
  };
  
  // Export cart to text file
  const exportCartToTxt = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    
    const subtotal = getCartSubtotal();
    const total = getCartTotal();
    const date = new Date().toLocaleDateString();
    const time = new Date().toLocaleTimeString();
    
    let content = `CYBERPUNK RED - GEAR PURCHASE INVOICE
Date: ${date}, ${time}
Vendor: ${currentVendor ? currentVendor.name : (nightMarketMode && activeVenue ? activeVenue.name : 'Standard Store')}
Night Market: ${nightMarketMode ? 'Active (' + (activeVenue?.name || 'Underground') + ')' : 'No'}
Haggle Discount: ${appliedCartDiscount > 0 ? (appliedCartDiscount * 100) + '% OFF' : (appliedCartDiscount < 0 ? '+10% Surcharge' : 'None')}

============================================================
ITEMS PURCHASED:
============================================================\n\n`;
    
    cart.forEach((item, index) => {
      const price = getItemPrice(item);
      const itemTotal = price * item.quantity;
      const opRank = getFixerOperatorRank(price);
      
      content += `${index + 1}. ${item.name}
   Type: ${item.type.toUpperCase()} | Qty: ${item.quantity}
   Unit: €$${price.toLocaleString()} | Total: €$${itemTotal.toLocaleString()}
   Availability: ${opRank.label}
   Quality: ${item.system.quality || 'standard'}
   Description: ${item.system.description?.value?.replace(/<[^>]*>/g, '').trim() || item.name}
\n`;
    });
    
    content += `============================================================
SUBTOTAL: €$${subtotal.toLocaleString()}
${appliedCartDiscount !== 0 ? `DISCOUNT / SURCHARGE: ${(appliedCartDiscount * 100).toFixed(0)}%\n` : ''}FINAL TOTAL: €$${total.toLocaleString()}
============================================================

Generated by Cyberpunk RED GM Tool - RED//GM
`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cyberpunk-receipt-${date.replace(/\//g, '-')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Purchase receipt exported');
  };
  
  const getRarityColor = (quality?: string) => {
    switch (quality?.toLowerCase()) {
      case 'poor': return 'text-muted-foreground bg-secondary';
      case 'excellent': return 'text-warning bg-warning/10 border-warning/30 border';
      case 'standard':
      default: return 'text-primary bg-primary/10 border-primary/20 border';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold neon-text-orange" style={{ fontFamily: 'var(--font-display)' }}>
              Night City Market & Shop
            </h2>
            <p className="text-xs text-muted-foreground">
              Direct access to all {allItems.length} items from Foundry VTT packs with Night Markets & Haggling
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap gap-2 items-center">
          <Button onClick={generateRandomVendor} variant="outline" size="sm">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Random Store
          </Button>

          <Button 
            onClick={rollNightMarket} 
            className="cyber-btn bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold"
            size="sm"
          >
            <Store className="w-3.5 h-3.5 mr-1.5" />
            Roll Night Market
          </Button>

          <Button 
            onClick={() => setShowHaggleModal(true)} 
            variant="outline" 
            size="sm"
            className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20"
          >
            <Percent className="w-3.5 h-3.5 mr-1.5" />
            Haggle Check
          </Button>

          <Button 
            onClick={() => setShowCart(!showCart)} 
            className="cyber-btn relative text-xs" 
            size="sm"
          >
            <ShoppingBag className="w-3.5 h-3.5 mr-1.5" />
            Cart
            {cart.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 bg-black text-primary rounded-full text-xs font-bold">
                {cart.reduce((sum, i) => sum + i.quantity, 0)} (€${getCartTotal().toLocaleString()})
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Night Market Banner */}
      {nightMarketMode && activeVenue && (
        <div className="glass-card rounded-xl p-4 border border-amber-500/40 bg-amber-950/20 space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs font-bold bg-amber-500 text-black rounded uppercase tracking-wider">
                  Active Night Market
                </span>
                <h3 className="text-lg font-bold text-amber-400">{activeVenue.name}</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">District:</span> {activeVenue.district} | <span className="font-semibold text-foreground">Security:</span> {activeVenue.security}
              </p>
              <p className="text-xs italic text-amber-200/80">{activeVenue.atmosphere}</p>
            </div>
            <Button onClick={() => setNightMarketMode(false)} variant="ghost" size="sm" className="h-7 w-7 p-0">
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Stalls Ribbon */}
          <div className="pt-2 border-t border-amber-500/20">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Available Night Market Stalls ({activeStalls.length}):
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedStallId('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  selectedStallId === 'all'
                    ? 'bg-amber-500 text-black border-amber-400 font-bold'
                    : 'bg-secondary/60 text-foreground border-border hover:border-amber-500/50'
                }`}
              >
                All Open Stalls
              </button>
              {activeStalls.map(stall => (
                <button
                  key={stall.id}
                  onClick={() => setSelectedStallId(stall.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all text-left ${
                    selectedStallId === stall.id
                      ? 'bg-amber-500 text-black border-amber-400 font-bold'
                      : 'bg-secondary/60 text-foreground border-border hover:border-amber-500/50'
                  }`}
                >
                  <div className="font-bold">{stall.name}</div>
                  <div className={`text-[10px] ${selectedStallId === stall.id ? 'text-black/80' : 'text-muted-foreground'}`}>
                    {stall.vendorName}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Standard Vendor Banner */}
      {currentVendor && (
        <div className="glass-card rounded-xl p-4 border border-primary/30 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg text-primary">{currentVendor.name}</h3>
            <p className="text-xs text-muted-foreground">{currentVendor.description}</p>
            <div className="flex gap-2 mt-2">
              <span className="text-xs px-2 py-0.5 bg-secondary rounded">
                Markup: {((currentVendor.markup - 1) * 100).toFixed(0)}%
              </span>
              <span className="text-xs px-2 py-0.5 bg-secondary rounded">
                Stock: {(currentVendor.availability * 100).toFixed(0)}%
              </span>
            </div>
          </div>
          <Button onClick={() => setCurrentVendor(null)} variant="ghost" size="sm">
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Cart Drawer / Panel */}
      {showCart && (
        <div className="glass-card rounded-xl p-5 border-2 border-primary/40 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-lg" style={{ fontFamily: 'var(--font-display)' }}>
                Active Shopping Cart ({cart.reduce((sum, i) => sum + i.quantity, 0)} items)
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={exportCartToTxt} variant="outline" size="sm" className="text-xs">
                <FileText className="w-3.5 h-3.5 mr-1" />
                Export Receipt (.txt)
              </Button>
              <Button onClick={clearCart} variant="ghost" size="sm" className="text-xs text-destructive hover:bg-destructive/10">
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Clear
              </Button>
              <Button onClick={() => setShowCart(false)} variant="ghost" size="sm" className="h-7 w-7 p-0">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {cart.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Your shopping cart is empty. Click "+ Add to Cart" on any item.</p>
          ) : (
            <>
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {cart.map(item => (
                  <div key={item._id} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/40 hover:bg-secondary/60 transition-colors">
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="font-bold text-sm truncate">{item.name}</div>
                      <div className="text-xs text-muted-foreground">
                        €${getItemPrice(item).toLocaleString()} each · <span className="uppercase">{item.type}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-border rounded-lg bg-background">
                        <button onClick={() => updateQuantity(item._id, -1)} className="p-1 hover:bg-secondary rounded-l">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-mono font-bold">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item._id, 1)} className="p-1 hover:bg-secondary rounded-r">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="w-20 text-right font-mono font-bold text-sm text-primary">
                        €${(getItemPrice(item) * item.quantity).toLocaleString()}
                      </span>
                      <button onClick={() => removeFromCart(item._id)} className="p-1 hover:bg-destructive/20 text-destructive rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Cart Totals Summary */}
              <div className="pt-3 border-t border-border flex flex-col md:flex-row justify-between items-center gap-3">
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-muted-foreground">Subtotal: €${getCartSubtotal().toLocaleString()}</span>
                  {appliedCartDiscount !== 0 && (
                    <span className={`px-2 py-0.5 rounded font-bold ${appliedCartDiscount > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-destructive/20 text-destructive'}`}>
                      {appliedCartDiscount > 0 ? `${(appliedCartDiscount * 100).toFixed(0)}% Haggle Discount` : '+10% Insult Surcharge'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold">Total:</span>
                  <span className="text-2xl font-mono font-bold text-primary">
                    €${getCartTotal().toLocaleString()}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Filters Bar */}
      <div className="glass-card rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-primary" />
          <span className="font-bold text-sm" style={{ fontFamily: 'var(--font-display)' }}>
            Search & Compendium Filters
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              placeholder="Search by item name, weapon type, brand..."
              className="cyber-input pl-9 text-xs"
            />
          </div>

          {/* Category */}
          <select
            value={filters.type}
            onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
            className="cyber-input text-xs"
          >
            <option value="all">All Categories</option>
            <option value="weapon">Weapons</option>
            <option value="armor">Armor</option>
            <option value="cyberware">Cyberware</option>
            <option value="gear">Gear</option>
            <option value="ammo">Ammo</option>
            <option value="drug">Drugs & Chems</option>
            <option value="clothing">Clothing</option>
            <option value="itemUpgrade">Item Upgrades</option>
            <optgroup label="Vehicles">
              <option value="vehicle">All Vehicles</option>
              <option value="vehicle-car">Cars & Groundcars</option>
              <option value="vehicle-motorcycle">Bikes & Motorcycles</option>
              <option value="vehicle-air">Air (AVs / Gyros)</option>
              <option value="vehicle-water">Watercraft</option>
            </optgroup>
          </select>

          {/* Fixer Operator Requirement */}
          <select
            value={filters.operatorTier}
            onChange={e => setFilters(f => ({ ...f, operatorTier: e.target.value }))}
            className="cyber-input text-xs"
          >
            <option value="all">Any Availability</option>
            <option value="0">Everyday (≤100eb, No Fixer)</option>
            <option value="1">Costly (≤500eb, Fixer 1+)</option>
            <option value="4">Premium (≤1k eb, Fixer 4+)</option>
            <option value="7">Expensive (≤5k eb, Fixer 7+)</option>
            <option value="8">Very Exp. (≤10k eb, Fixer 8+)</option>
            <option value="9">Luxury (&gt;10k eb, Fixer 9+)</option>
          </select>

          {/* Price Range */}
          <select
            value={filters.priceRange}
            onChange={e => setFilters(f => ({ ...f, priceRange: e.target.value }))}
            className="cyber-input text-xs"
          >
            <option value="all">All Prices</option>
            <option value="cheap">Cheap (≤100eb)</option>
            <option value="budget">Budget (101-500eb)</option>
            <option value="standard">Standard (501-2000eb)</option>
            <option value="expensive">Expensive (2001-10000eb)</option>
            <option value="luxury">Luxury (&gt;10000eb)</option>
          </select>

          {/* Sort */}
          <select
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onChange={e => {
              const [sortBy, sortOrder] = e.target.value.split('-');
              setFilters(f => ({ ...f, sortBy, sortOrder: sortOrder as 'asc' | 'desc' }));
            }}
            className="cyber-input text-xs"
          >
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="price-asc">Price (Low-High)</option>
            <option value="price-desc">Price (High-Low)</option>
            <option value="type-asc">Type (A-Z)</option>
          </select>
        </div>

        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-xs">
            <input
              type="checkbox"
              checked={filters.hideZeroPrice}
              onChange={e => setFilters(f => ({ ...f, hideZeroPrice: e.target.checked }))}
              className="w-3.5 h-3.5 accent-primary"
            />
            <span>Hide items with €$0 price</span>
          </label>

          <span className="text-xs text-muted-foreground">
            Showing <strong className="text-primary">{filteredItems.length}</strong> of {allItems.length} authentic Foundry items
          </span>
        </div>
      </div>

      {/* Items Catalog Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredItems.map(item => {
          const price = getItemPrice(item);
          const opRank = getFixerOperatorRank(price);
          const cleanDesc = item.system.description?.value?.replace(/<[^>]*>/g, '').trim();

          return (
            <div 
              key={item._id} 
              className="glass-card rounded-xl p-4 hover:border-primary/50 transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h3 className="font-bold group-hover:text-primary transition-colors text-sm leading-snug">
                    {item.name}
                  </h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-semibold whitespace-nowrap ${getRarityColor(item.system.quality)}`}>
                    {item.system.quality || 'standard'}
                  </span>
                </div>

                {/* Operator Requirement Tag */}
                <div className="mb-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${opRank.badgeColor}`}>
                    {opRank.label}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground mb-3 line-clamp-3">
                  {cleanDesc || 'No additional description in database.'}
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-border/50">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-primary font-mono font-bold text-base">
                    <Tag className="w-3.5 h-3.5" />
                    €${price.toLocaleString()}
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-secondary rounded text-muted-foreground">
                    {item.type}
                  </span>
                </div>

                {/* Item Stats pills */}
                <div className="flex flex-wrap gap-1 text-xs">
                  {item.system.damage && (
                    <ClickableDice notation={item.system.damage} />
                  )}
                  {item.system.rof && (
                    <span className="px-1.5 py-0.5 bg-secondary rounded font-mono text-[11px]">
                      ROF:{item.system.rof}
                    </span>
                  )}
                  {item.system.bodyLocation?.sp && (
                    <span className="px-1.5 py-0.5 bg-secondary rounded font-mono text-[11px]">
                      SP:{item.system.bodyLocation.sp}
                    </span>
                  )}
                  {item.system.headLocation?.sp && (
                    <span className="px-1.5 py-0.5 bg-secondary rounded font-mono text-[11px]">
                      Head:{item.system.headLocation.sp}
                    </span>
                  )}
                  {item.system.hlCost !== undefined && (
                    <span className="px-1.5 py-0.5 bg-secondary rounded font-mono text-[11px] text-amber-400">
                      HL:{typeof item.system.hlCost === 'object' ? (item.system.hlCost.roll || item.system.hlCost.static) : item.system.hlCost}
                    </span>
                  )}
                  {item.system.magazine?.max && (
                    <span className="px-1.5 py-0.5 bg-secondary rounded font-mono text-[11px]">
                      Mag:{item.system.magazine.max}
                    </span>
                  )}
                </div>

                <Button 
                  onClick={() => addToCart(item)} 
                  size="sm" 
                  className="w-full cyber-btn-secondary text-xs h-8"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add to Cart
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12 text-muted-foreground glass-card rounded-xl">
          <Package className="w-16 h-16 mx-auto mb-4 opacity-30 text-primary" />
          <p className="text-sm font-semibold">No items match your active filters</p>
          <Button 
            onClick={() => {
              setFilters({
                type: 'all',
                priceRange: 'all',
                quality: 'all',
                search: '',
                sortBy: 'name',
                sortOrder: 'asc',
                hideZeroPrice: true,
                operatorTier: 'all'
              });
              setSelectedStallId('all');
              setCurrentVendor(null);
            }} 
            variant="outline" 
            className="mt-4 text-xs"
          >
            Reset All Filters
          </Button>
        </div>
      )}

      {/* Haggling Modal */}
      {showHaggleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="glass-card rounded-2xl p-6 max-w-md w-full border-2 border-emerald-500/50 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Percent className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-lg text-emerald-400" style={{ fontFamily: 'var(--font-display)' }}>
                  Haggling & Trading Assistant
                </h3>
              </div>
              <Button onClick={() => setShowHaggleModal(false)} variant="ghost" size="sm" className="h-7 w-7 p-0">
                <X className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Cyberpunk RED Trading Check: Roll <strong>1d10 (Exploding) + Trading Skill</strong> against the merchant's target DV.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Player Trading Base</label>
                <Input
                  type="number"
                  value={tradingSkillBase}
                  onChange={e => setTradingSkillBase(parseInt(e.target.value) || 0)}
                  className="cyber-input text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Merchant Target DV</label>
                <select
                  value={merchantDV}
                  onChange={e => setMerchantDV(parseInt(e.target.value))}
                  className="cyber-input text-sm"
                >
                  <option value={13}>DV 13 (Standard Merchant)</option>
                  <option value={15}>DV 15 (Experienced Trader)</option>
                  <option value={17}>DV 17 (Seasoned Fixer)</option>
                  <option value={21}>DV 21 (Street Legend Fixer)</option>
                </select>
              </div>
            </div>

            <Button 
              onClick={handleRollHaggle} 
              className="w-full cyber-btn bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
            >
              <Dices className="w-4 h-4 mr-2" />
              Roll 1d10 + Trading vs DV {merchantDV}
            </Button>

            {haggleResult && (
              <div className={`p-4 rounded-xl border ${
                haggleResult.discount > 0 
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' 
                  : haggleResult.discount < 0 
                    ? 'bg-destructive/10 border-destructive/40 text-destructive' 
                    : 'bg-secondary/40 border-border text-muted-foreground'
              } space-y-2`}>
                <div className="flex items-center justify-between text-sm font-bold">
                  <span>Result: {haggleResult.success ? 'SUCCESS' : 'FAILED'}</span>
                  <span className="font-mono">Total {haggleResult.total} vs DV {haggleResult.dv}</span>
                </div>
                <p className="text-xs leading-relaxed">{haggleResult.message}</p>

                {haggleResult.discount !== 0 && (
                  <Button 
                    onClick={applyHaggleToCart} 
                    size="sm" 
                    className="w-full mt-2 bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400"
                  >
                    Apply {haggleResult.discount > 0 ? `${(haggleResult.discount * 100).toFixed(0)}% Discount` : 'Surcharge'} to Active Cart
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

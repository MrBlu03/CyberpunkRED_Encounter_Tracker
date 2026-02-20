import { useState, useEffect } from 'react';
import yaml from 'js-yaml';
import { ShoppingCart, Search, Filter, RefreshCw, Package, Tag, Loader2, ShoppingBag, X, Plus, Minus, Trash2, Dices, Sparkles, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { rollDiceDetailed } from '@/lib/dice';

// Foundry VTT format item interface
interface FVTTItem {
  _id: string;
  name: string;
  type: 'weapon' | 'armor' | 'cyberware' | 'gear' | 'drug' | 'ammo' | 'clothing' | 'itemUpgrade' | 'vehicle';
  system: {
    price?: { market: number };
    cost?: number;
    value?: number;
    quality?: 'poor' | 'standard' | 'excellent';
    category?: string;
    brand?: string;
    source?: { book: string; page: number };
    description?: { value: string };
    damage?: string;
    weaponType?: string;
    bodyLocation?: { sp: number };
    headLocation?: { sp: number };
    penalty?: number;
    attackmod?: number;
    rof?: number;
    magazine?: { max: number };
    weaponSkill?: string;
    hlCost?: number;
    slots?: number;
  };
  img?: string;
}

interface CartItem extends FVTTItem {
  quantity: number;
}

interface Vendor {
  name: string;
  type: 'weapons' | 'armor' | 'clothing' | 'general' | 'ripper-doc' | 'tech' | 'black-market';
  location: 'city-center' | 'corpo-plaza' | 'watson' | 'westbrook' | 'santo-domingo' | 'pacifica' | 'badlands';
  description: string;
  specialties: string[];
  markup: number;
  availability: number;
}

const VENDOR_TYPES: Record<string, { name: string; specialties: string[]; markup: number }> = {
  'weapons': { name: 'Gun Shop', specialties: ['weapon'], markup: 1.1 },
  'armor': { name: 'Armor Shop', specialties: ['armor'], markup: 1.2 },
  'clothing': { name: 'Clothing Store', specialties: ['clothing'], markup: 1.0 },
  'general': { name: 'General Store', specialties: ['gear', 'ammo', 'drug'], markup: 1.3 },
  'ripper-doc': { name: 'Ripperdoc', specialties: ['cyberware'], markup: 1.5 },
  'tech': { name: 'Tech Shop', specialties: ['gear', 'cyberware'], markup: 1.4 },
  'black-market': { name: 'Black Market', specialties: ['weapon', 'cyberware', 'drug', 'armor'], markup: 2.0 }
};

const LOCATIONS: Record<string, { name: string; description: string; qualityBonus: number }> = {
  'city-center': { name: 'City Center', description: 'High-end corporate district', qualityBonus: 0.3 },
  'corpo-plaza': { name: 'Corpo Plaza', description: 'Ultra-luxury corporate zone', qualityBonus: 0.5 },
  'watson': { name: 'Watson', description: 'Industrial immigrant district', qualityBonus: -0.2 },
  'westbrook': { name: 'Westbrook', description: 'Entertainment and luxury district', qualityBonus: 0.2 },
  'santo-domingo': { name: 'Santo Domingo', description: 'Manufacturing and working class', qualityBonus: -0.1 },
  'pacifica': { name: 'Pacifica', description: 'Abandoned tourist district', qualityBonus: -0.3 },
  'badlands': { name: 'Badlands', description: 'Nomad territory outside the city', qualityBonus: -0.4 }
};

export function ShopGenerator() {
  const [allItems, setAllItems] = useState<FVTTItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<FVTTItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentVendor, setCurrentVendor] = useState<Vendor | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [nightMarketMode, setNightMarketMode] = useState(false);
  
  const [filters, setFilters] = useState({
    type: 'all',
    priceRange: 'all',
    quality: 'all',
    search: '',
    sortBy: 'name',
    sortOrder: 'asc' as 'asc' | 'desc',
    hideZeroPrice: true
  });
  
  // Load shop data from JSON files
  useEffect(() => {
    loadShopData();
  }, []);
  
  // Apply filters when data or filters change
  useEffect(() => {
    applyFilters();
  }, [allItems, filters, nightMarketMode, currentVendor]);
  
  // Clickable Dice Component
  const ClickableDice = ({ notation }: { notation: string }) => {
    const handleRoll = () => {
      const result = rollDiceDetailed(notation);
      const critCount = result.rolls.filter(r => r === 6).length;
      const isCritical = critCount > 0;
      
      if (isCritical) {
        toast.success(`🎲 CRITICAL! Rolled ${critCount} six${critCount > 1 ? 'es' : ''}! Total: ${result.total}`, {
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
        title="Click to roll"
      >
        <Dices className="w-3 h-3" />
        {notation}
      </button>
    );
  };
  
  const loadShopData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      let allData: FVTTItem[] = [];

      // Helper to flatten and normalize FVTT items
      const normalizeItems = (data: any): FVTTItem[] => {
        if (!data) return [];
        if (Array.isArray(data)) return data as FVTTItem[];
        if (typeof data === 'object' && Object.values(data).every(v => typeof v === 'object')) {
          // Sometimes YAML is a dict of items
          return Object.values(data) as FVTTItem[];
        }
        return [];
      };

      // Load all JSON files listed in the global manifest (all packs)
      try {
        const manifestResp = await fetch('/fvtt/packs_json/manifest.json');
        if (manifestResp.ok) {
          const manifest = await manifestResp.json();
          if (Array.isArray(manifest)) {
            for (const relPath of manifest) {
              const jsonFile = `/fvtt/packs_json/${relPath}`;
              try {
                const resp = await fetch(jsonFile);
                if (resp.ok) {
                  const data = await resp.json();
                  allData = [...allData, ...normalizeItems(data)];
                }
              } catch (e) {
                // Ignore errors, continue
              }
            }
          }
        }
      } catch (e) {
        console.log('packs_json manifest loading error:', e);
      }

      // Load from public/data folder as fallback
      if (allData.length === 0) {
        const packs = ['core', 'black-chrome', 'dlc'];
        for (const pack of packs) {
          try {
            const response = await fetch(`/data/${pack}.json`);
            if (response.ok) {
              const data = await response.json();
              allData = [...allData, ...normalizeItems(data)];
            }
          } catch (error) {
            console.log(`Pack ${pack} not available:`, error);
          }
        }
      }

      // If no data loaded, use fallback
      if (allData.length === 0) {
        allData = getFallbackData();
      }

      // Filter for shop items
      const shopItems = allData.filter((item: FVTTItem) => {
        if (!item || !item.type) return false;
        const hasPrice = item.system?.price?.market !== undefined || 
                        item.system?.cost !== undefined ||
                        item.system?.value !== undefined;
        const isShopItem = ['weapon', 'armor', 'cyberware', 'gear', 'drug', 'ammo', 'clothing', 'itemUpgrade'].includes(item.type);
        return isShopItem && (hasPrice || item.type === 'cyberware');
      });
      setAllItems(shopItems);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load shop data:', error);
      setLoadError(error instanceof Error ? error.message : 'Unknown error');
      setAllItems(getFallbackData());
      setIsLoading(false);
    }
  };
  
  // Fallback data in case JSON files aren't available
  const getFallbackData = (): FVTTItem[] => {
    return [
      // Weapons
      { _id: 'w1', name: 'Medium Pistol', type: 'weapon', system: { price: { market: 50 }, damage: '2d6', rof: 2, weaponSkill: 'Handgun', quality: 'standard', description: { value: 'Standard sidearm' } } },
      { _id: 'w2', name: 'Heavy Pistol', type: 'weapon', system: { price: { market: 100 }, damage: '3d6', rof: 2, weaponSkill: 'Handgun', quality: 'standard', description: { value: 'Powerful handgun' } } },
      { _id: 'w3', name: 'Very Heavy Pistol', type: 'weapon', system: { price: { market: 100 }, damage: '4d6', rof: 1, weaponSkill: 'Handgun', quality: 'standard', description: { value: 'Maximum stopping power' } } },
      { _id: 'w4', name: 'SMG', type: 'weapon', system: { price: { market: 100 }, damage: '2d6', rof: 3, weaponSkill: 'Autofire', quality: 'standard', description: { value: 'Compact automatic' } } },
      { _id: 'w5', name: 'Heavy SMG', type: 'weapon', system: { price: { market: 100 }, damage: '3d6', rof: 3, weaponSkill: 'Autofire', quality: 'standard', description: { value: 'High rate of fire' } } },
      { _id: 'w6', name: 'Assault Rifle', type: 'weapon', system: { price: { market: 500 }, damage: '5d6', rof: 3, weaponSkill: 'Shoulder Arms', quality: 'standard', description: { value: 'Military grade' } } },
      { _id: 'w7', name: 'Sniper Rifle', type: 'weapon', system: { price: { market: 500 }, damage: '5d6', rof: 1, weaponSkill: 'Shoulder Arms', quality: 'standard', description: { value: 'Long range precision' } } },
      { _id: 'w8', name: 'Shotgun', type: 'weapon', system: { price: { market: 500 }, damage: '5d6', rof: 1, weaponSkill: 'Shoulder Arms', quality: 'standard', description: { value: 'Close quarters devastation' } } },
      { _id: 'w9', name: 'Heavy Melee Weapon', type: 'weapon', system: { price: { market: 50 }, damage: '1d6', rof: 2, weaponSkill: 'Melee Weapon', quality: 'standard', description: { value: 'Baseball bat, crowbar, etc.' } } },
      { _id: 'w10', name: 'Light Melee Weapon', type: 'weapon', system: { price: { market: 10 }, damage: '1d6', rof: 2, weaponSkill: 'Melee Weapon', quality: 'standard', description: { value: 'Knife, baton, etc.' } } },
      // Armor
      { _id: 'a1', name: 'Leathers', type: 'armor', system: { price: { market: 20 }, bodyLocation: { sp: 4 }, quality: 'standard', description: { value: 'Basic protection' } } },
      { _id: 'a2', name: 'Kevlar', type: 'armor', system: { price: { market: 50 }, bodyLocation: { sp: 7 }, quality: 'standard', description: { value: 'Bullet-resistant vest' } } },
      { _id: 'a3', name: 'Light Armorjack', type: 'armor', system: { price: { market: 100 }, bodyLocation: { sp: 11 }, quality: 'standard', description: { value: 'Reinforced jacket' } } },
      { _id: 'a4', name: 'Bodyweight Suit', type: 'armor', system: { price: { market: 1000 }, bodyLocation: { sp: 11 }, quality: 'standard', description: { value: 'Full body protection' } } },
      { _id: 'a5', name: 'Medium Armorjack', type: 'armor', system: { price: { market: 100 }, bodyLocation: { sp: 12 }, quality: 'standard', description: { value: 'Heavy duty protection' } } },
      { _id: 'a6', name: 'Heavy Armorjack', type: 'armor', system: { price: { market: 500 }, bodyLocation: { sp: 13 }, quality: 'standard', description: { value: 'Maximum protection' } } },
      { _id: 'a7', name: 'Flak', type: 'armor', system: { price: { market: 500 }, bodyLocation: { sp: 15 }, quality: 'standard', description: { value: 'Military armor' } } },
      { _id: 'a8', name: 'Metalgear', type: 'armor', system: { price: { market: 5000 }, bodyLocation: { sp: 18 }, quality: 'standard', description: { value: 'Powered armor' } } },
      // Cyberware
      { _id: 'c1', name: 'Neural Link', type: 'cyberware', system: { price: { market: 500 }, hlCost: 7, slots: 2, quality: 'standard', description: { value: 'Basic neural interface' } } },
      { _id: 'c2', name: 'Interface Plugs', type: 'cyberware', system: { price: { market: 500 }, hlCost: 7, slots: 2, quality: 'standard', description: { value: 'Direct connection ports' } } },
      { _id: 'c3', name: 'Chipware Socket', type: 'cyberware', system: { price: { market: 500 }, hlCost: 7, slots: 2, quality: 'standard', description: { value: 'Skill chip interface' } } },
      { _id: 'c4', name: 'Cyberoptics', type: 'cyberware', system: { price: { market: 100 }, hlCost: 7, slots: 2, quality: 'standard', description: { value: 'Enhanced vision' } } },
      { _id: 'c5', name: 'Cyberarm', type: 'cyberware', system: { price: { market: 500 }, hlCost: 7, slots: 2, quality: 'standard', description: { value: 'Prosthetic arm' } } },
      { _id: 'c6', name: 'Cyberleg', type: 'cyberware', system: { price: { market: 500 }, hlCost: 7, slots: 2, quality: 'standard', description: { value: 'Prosthetic leg' } } },
      { _id: 'c7', name: 'Subdermal Armor', type: 'cyberware', system: { price: { market: 1000 }, hlCost: 7, slots: 2, quality: 'standard', description: { value: 'Under-skin protection' } } },
      { _id: 'c8', name: 'Scratchers', type: 'cyberware', system: { price: { market: 100 }, hlCost: 7, slots: 2, quality: 'standard', description: { value: 'Retractable claws' } } },
      { _id: 'c9', name: 'Rippers', type: 'cyberware', system: { price: { market: 500 }, hlCost: 7, slots: 2, quality: 'standard', description: { value: 'Enhanced scratchers' } } },
      { _id: 'c10', name: 'Big Knucks', type: 'cyberware', system: { price: { market: 100 }, hlCost: 7, slots: 2, quality: 'standard', description: { value: 'Reinforced knuckles' } } },
      { _id: 'c11', name: 'Slice n\' Dice', type: 'cyberware', system: { price: { market: 1000 }, hlCost: 7, slots: 2, quality: 'standard', description: { value: 'Monofilament whip' } } },
      { _id: 'c12', name: 'Wolvers', type: 'cyberware', system: { price: { market: 1000 }, hlCost: 7, slots: 2, quality: 'standard', description: { value: 'Retractable blades' } } },
      // Gear
      { _id: 'g1', name: 'Agent', type: 'gear', system: { price: { market: 100 }, quality: 'standard', description: { value: 'Personal AI assistant' } } },
      { _id: 'g2', name: 'Audio Recorder', type: 'gear', system: { price: { market: 50 }, quality: 'standard', description: { value: 'Records audio' } } },
      { _id: 'g3', name: 'Binoculars', type: 'gear', system: { price: { market: 50 }, quality: 'standard', description: { value: 'Enhanced vision' } } },
      { _id: 'g4', name: 'Breathing Mask', type: 'gear', system: { price: { market: 20 }, quality: 'standard', description: { value: 'Filters toxic air' } } },
      { _id: 'g5', name: 'Carryall', type: 'gear', system: { price: { market: 5 }, quality: 'standard', description: { value: 'Large bag' } } },
      { _id: 'g6', name: 'Chemical Analyzer', type: 'gear', system: { price: { market: 1000 }, quality: 'standard', description: { value: 'Identifies substances' } } },
      { _id: 'g7', name: 'Computer', type: 'gear', system: { price: { market: 50 }, quality: 'standard', description: { value: 'Laptop or deck' } } },
      { _id: 'g8', name: 'First Aid Kit', type: 'gear', system: { price: { market: 10 }, quality: 'standard', description: { value: 'Basic medical supplies' } } },
      { _id: 'g9', name: 'Flashlight', type: 'gear', system: { price: { market: 5 }, quality: 'standard', description: { value: 'Portable light' } } },
      { _id: 'g10', name: 'Grapple Gun', type: 'gear', system: { price: { market: 100 }, quality: 'standard', description: { value: 'Fires grappling hook' } } },
      { _id: 'g11', name: 'Handcuffs', type: 'gear', system: { price: { market: 10 }, quality: 'standard', description: { value: 'Restraints' } } },
      { _id: 'g12', name: 'Homing Tracer', type: 'gear', system: { price: { market: 500 }, quality: 'standard', description: { value: 'Tracking device' } } },
    ];
  };
  
  const seededRandom = (seedStr: string): number => {
    let seed = 0;
    for (let i = 0; i < seedStr.length; i++) {
      seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
    }
    seed = (1103515245 * seed + 12345) % 0x80000000;
    return seed / 0x80000000;
  };
  
  const applyFilters = () => {
    let filtered = [...allItems];
    
    // Type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter(item => item.type === filters.type);
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
    
    // Night Market mode - deterministically show only 30% of items based on ID
    if (nightMarketMode) {
      filtered = filtered.filter(item => seededRandom(`nightmarket-${item._id}`) < 0.3);
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
    
    setFilteredItems(filtered);
  };
  
  const getItemPrice = (item: FVTTItem): number => {
    let price = item.system?.price?.market ?? item.system?.cost ?? item.system?.value ?? 0;
    if (currentVendor) {
      price = Math.round(price * currentVendor.markup);
    }
    return price;
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
      availability: 0.5 + Math.random() * 0.5 // 50-100% availability
    };
    
    setCurrentVendor(newVendor);
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
  
  const getCartTotal = () => {
    return cart.reduce((total, item) => total + getItemPrice(item) * item.quantity, 0);
  };
  
  const clearCart = () => {
    setCart([]);
    toast.info('Cart cleared');
  };
  
  // Export cart to text file
  const exportCartToTxt = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    
    const total = getCartTotal();
    const vendorName = currentVendor ? currentVendor.name : 'Generic Shop';
    const date = new Date().toLocaleDateString();
    
    let content = `╔════════════════════════════════════════════════════════════════╗
║           CYBERPUNK RED - SHOPPING RECEIPT                     ║
╠════════════════════════════════════════════════════════════════╣
║ Vendor: ${vendorName.padEnd(50)} ║
║ Date: ${date.padEnd(52)} ║
╠════════════════════════════════════════════════════════════════╣
║ ITEM                                                           ║
║ NAME                          TYPE        QTY    PRICE     TOTAL ║
╠════════════════════════════════════════════════════════════════╣
`;
    
    cart.forEach(item => {
      const price = getItemPrice(item);
      const itemTotal = price * item.quantity;
      const name = item.name.slice(0, 28).padEnd(28);
      const type = item.type.slice(0, 10).padEnd(10);
      const qty = item.quantity.toString().padStart(3);
      const priceStr = `${price}eb`.padStart(8);
      const totalStr = `${itemTotal}eb`.padStart(8);
      
      content += `║ ${name} ${type} ${qty} ${priceStr} ${totalStr} ║\n`;
      
      // Add stats for each item
      const stats: string[] = [];
      if (item.system.damage) stats.push(`DMG: ${item.system.damage}`);
      if (item.system.rof) stats.push(`ROF: ${item.system.rof}`);
      if (item.system.bodyLocation?.sp) stats.push(`Body SP: ${item.system.bodyLocation.sp}`);
      if (item.system.headLocation?.sp) stats.push(`Head SP: ${item.system.headLocation.sp}`);
      if (item.system.hlCost) stats.push(`HL: ${item.system.hlCost}`);
      if (item.system.slots) stats.push(`Slots: ${item.system.slots}`);
      if (item.system.weaponSkill) stats.push(`Skill: ${item.system.weaponSkill}`);
      if (item.system.attackmod) stats.push(`ATK Mod: ${item.system.attackmod > 0 ? '+' : ''}${item.system.attackmod}`);
      if (item.system.magazine?.max) stats.push(`Mag: ${item.system.magazine.max}`);
      
      if (stats.length > 0) {
        const statsLine = `    [${stats.join(' | ')}]`;
        content += `║ ${statsLine.slice(0, 62).padEnd(62)} ║\n`;
      }
      
      // Add description if available
      const desc = item.system.description?.value?.replace(/<[^>]*>/g, '').slice(0, 58);
      if (desc) {
        content += `║    "${desc}"${desc.length >= 58 ? '...' : ''}`.padEnd(65) + '║\n';
      }
      
      content += `║                                                                ║\n`;
    });
    
    content += `╠════════════════════════════════════════════════════════════════╣
║ ${`TOTAL: ${total}eb`.padStart(62)} ║
╚════════════════════════════════════════════════════════════════╝

Generated by Cyberpunk RED GM Tool
`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cyberpunk-shopping-${date.replace(/\//g, '-')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Shopping list exported');
  };
  
  const getRarityColor = (quality?: string) => {
    switch (quality?.toLowerCase()) {
      case 'poor': return 'text-muted-foreground bg-secondary';
      case 'excellent': return 'text-warning bg-warning/10';
      case 'standard':
      default: return 'text-primary bg-primary/10';
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading shop data...</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
          <ShoppingCart className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            Shop Generator
          </h2>
          <p className="text-sm text-muted-foreground">
            Generate vendors and browse items from Foundry VTT data
          </p>
        </div>
      </div>
      
      {/* FVTT Data Notice */}
      {loadError && (
        <div className="glass-card rounded-xl p-4 border border-warning/30 bg-warning/10">
          <p className="text-sm text-warning">
            <strong>Tip:</strong> Add your Foundry VTT data to <code className="bg-secondary px-1 rounded">/public/fvtt/</code> folder for more items.
            See <code className="bg-secondary px-1 rounded">/public/fvtt/README.md</code> for instructions.
          </p>
        </div>
      )}
      
      {/* Vendor Info */}
      {currentVendor && (
        <div className="glass-card rounded-xl p-4 border border-primary/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg text-primary">{currentVendor.name}</h3>
              <p className="text-sm text-muted-foreground">{currentVendor.description}</p>
              <div className="flex gap-2 mt-2">
                <span className="text-xs px-2 py-1 bg-secondary rounded">
                  Markup: {((currentVendor.markup - 1) * 100).toFixed(0)}%
                </span>
                <span className="text-xs px-2 py-1 bg-secondary rounded">
                  Stock: {(currentVendor.availability * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            <Button onClick={() => setCurrentVendor(null)} variant="ghost" size="sm">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
      
      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={generateRandomVendor} className="cyber-btn">
          <RefreshCw className="w-4 h-4 mr-2" />
          Generate Vendor
        </Button>
        <Button 
          onClick={() => setNightMarketMode(!nightMarketMode)} 
          variant={nightMarketMode ? 'default' : 'outline'}
        >
          {nightMarketMode ? 'Night Market: ON' : 'Night Market: OFF'}
        </Button>
        <Button onClick={loadShopData} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Reload Data
        </Button>
        <Button onClick={() => setShowCart(!showCart)} variant="outline" className="relative">
          <ShoppingBag className="w-4 h-4 mr-2" />
          Cart
          {cart.length > 0 && (
            <span className="absolute -top-2 -right-2 w-5 h-5 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center">
              {cart.reduce((sum, i) => sum + i.quantity, 0)}
            </span>
          )}
        </Button>
      </div>
      
      {/* Cart Panel */}
      {showCart && (
        <div className="glass-card rounded-xl p-4 animate-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold" style={{ fontFamily: 'var(--font-display)' }}>Shopping Cart</h3>
            <div className="flex gap-2">
              <Button onClick={exportCartToTxt} variant="outline" size="sm" className="gap-1">
                <FileText className="w-4 h-4" />
                Export
              </Button>
              <Button onClick={clearCart} variant="ghost" size="sm">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {cart.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Cart is empty</p>
          ) : (
            <>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {cart.map(item => (
                  <div key={item._id} className="flex items-center justify-between p-2 bg-secondary/50 rounded-lg">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{getItemPrice(item)}eb each</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => updateQuantity(item._id, -1)}
                        className="w-6 h-6 rounded bg-secondary hover:bg-primary/20 flex items-center justify-center"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item._id, 1)}
                        className="w-6 h-6 rounded bg-secondary hover:bg-primary/20 flex items-center justify-center"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={() => removeFromCart(item._id)}
                        className="w-6 h-6 rounded bg-destructive/20 text-destructive hover:bg-destructive/30 flex items-center justify-center ml-2"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                <span className="font-bold">Total:</span>
                <span className="text-xl font-bold text-primary">{getCartTotal()}eb</span>
              </div>
            </>
          )}
        </div>
      )}
      
      {/* Filters */}
      <div className="glass-card rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="w-4 h-4 text-primary" />
          <span className="font-bold" style={{ fontFamily: 'var(--font-display)' }}>Filters</span>
        </div>
        
        <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              placeholder="Search items..."
              className="cyber-input pl-10"
            />
          </div>
          
          {/* Category */}
          <select
            value={filters.type}
            onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
            className="cyber-input"
          >
            <option value="all">All Categories</option>
            <option value="weapon">Weapons</option>
            <option value="armor">Armor</option>
            <option value="gear">Gear</option>
            <option value="cyberware">Cyberware</option>
            <option value="ammo">Ammo</option>
            <option value="drug">Drugs</option>
            <option value="clothing">Clothing</option>
          </select>
          
          {/* Price Range */}
          <select
            value={filters.priceRange}
            onChange={e => setFilters(f => ({ ...f, priceRange: e.target.value }))}
            className="cyber-input"
          >
            <option value="all">All Prices</option>
            <option value="cheap">Cheap (≤100eb)</option>
            <option value="budget">Budget (101-500eb)</option>
            <option value="standard">Standard (501-2000eb)</option>
            <option value="expensive">Expensive (2001-10000eb)</option>
            <option value="luxury">Luxury (&gt;10000eb)</option>
          </select>
          
          {/* Quality */}
          <select
            value={filters.quality}
            onChange={e => setFilters(f => ({ ...f, quality: e.target.value }))}
            className="cyber-input"
          >
            <option value="all">All Qualities</option>
            <option value="poor">Poor</option>
            <option value="standard">Standard</option>
            <option value="excellent">Excellent</option>
          </select>
          
          {/* Sort */}
          <select
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onChange={e => {
              const [sortBy, sortOrder] = e.target.value.split('-');
              setFilters(f => ({ ...f, sortBy, sortOrder: sortOrder as 'asc' | 'desc' }));
            }}
            className="cyber-input"
          >
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="price-asc">Price (Low-High)</option>
            <option value="price-desc">Price (High-Low)</option>
            <option value="type-asc">Type (A-Z)</option>
          </select>
        </div>
        
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.hideZeroPrice}
            onChange={e => setFilters(f => ({ ...f, hideZeroPrice: e.target.checked }))}
            className="w-4 h-4 accent-primary"
          />
          <span className="text-sm">Hide items with no price</span>
        </label>
      </div>
      
      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredItems.length} of {allItems.length} items
        </p>
        {loadError && (
          <p className="text-xs text-warning">Using fallback data (JSON files not found)</p>
        )}
      </div>
      
      {/* Items Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredItems.map(item => (
          <div 
            key={item._id} 
            className="glass-card rounded-xl p-4 hover:border-primary/50 transition-all group flex flex-col"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-bold group-hover:text-primary transition-colors text-sm">{item.name}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${getRarityColor(item.system.quality)}`}>
                {item.system.quality || 'standard'}
              </span>
            </div>
            
            <p className="text-xs text-muted-foreground mb-3 line-clamp-2 flex-1">
              {item.system.description?.value?.replace(/<[^>]*>/g, '') || 'No description'}
            </p>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-primary font-mono font-bold">
                  <Tag className="w-3 h-3" />
                  {getItemPrice(item)}eb
                </span>
                <span className="text-xs uppercase text-muted-foreground">{item.type}</span>
              </div>
              
              {/* Item Stats */}
              <div className="flex flex-wrap gap-1 text-xs">
                {item.system.damage && (
                  <ClickableDice notation={item.system.damage} />
                )}
                {item.system.rof && (
                  <span className="px-2 py-0.5 bg-secondary rounded font-mono">
                    ROF:{item.system.rof}
                  </span>
                )}
                {item.system.bodyLocation?.sp && (
                  <span className="px-2 py-0.5 bg-secondary rounded font-mono">
                    SP:{item.system.bodyLocation.sp}
                  </span>
                )}
                {item.system.headLocation?.sp && (
                  <span className="px-2 py-0.5 bg-secondary rounded font-mono">
                    Head:{item.system.headLocation.sp}
                  </span>
                )}
                {item.system.hlCost && (
                  <span className="px-2 py-0.5 bg-secondary rounded font-mono">
                    HL:{item.system.hlCost}
                  </span>
                )}
                {item.system.slots && (
                  <span className="px-2 py-0.5 bg-secondary rounded font-mono">
                    Slots:{item.system.slots}
                  </span>
                )}
              </div>
              
              <Button onClick={() => addToCart(item)} size="sm" className="w-full cyber-btn-secondary">
                <Plus className="w-4 h-4 mr-1" />
                Add to Cart
              </Button>
            </div>
          </div>
        ))}
      </div>
      
      {filteredItems.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p>No items match your filters</p>
          <Button onClick={() => {
            setFilters({
              type: 'all',
              priceRange: 'all',
              quality: 'all',
              search: '',
              sortBy: 'name',
              sortOrder: 'asc',
              hideZeroPrice: true
            });
            setCurrentVendor(null);
            setNightMarketMode(false);
          }} variant="outline" className="mt-4">
            Clear All Filters
          </Button>
        </div>
      )}
    </div>
  );
}

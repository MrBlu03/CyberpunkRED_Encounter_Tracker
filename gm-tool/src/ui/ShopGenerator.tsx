import React, { useState, useEffect } from 'react';

interface ShopItem {
  _id: string;
  name: string;
  type: 'weapon' | 'armor' | 'cyberware' | 'gear' | 'drug' | 'ammo' | 'clothing';
  system: {
    price?: { market: number };
    cost?: number;
    value?: number;
    quality?: string;
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
  };
}

interface CartItem extends ShopItem {
  quantity: number;
}

interface Vendor {
  name: string;
  type: 'weapons' | 'armor' | 'clothing' | 'general' | 'ripper-doc' | 'tech' | 'black-market';
  location: 'city-center' | 'corpo-plaza' | 'watson' | 'westbrook' | 'santo-domingo' | 'pacifica' | 'badlands';
  description: string;
  specialties: string[];
  markup: number; // Price multiplier
  availability: number; // 0.1 to 1.0 - percentage of items available
}

const vendorTypes = {
  'weapons': { name: 'Gun Shop', specialties: ['weapon'], markup: 1.1 },
  'armor': { name: 'Armor Shop', specialties: ['armor'], markup: 1.2 },
  'clothing': { name: 'Clothing Store', specialties: ['clothing'], markup: 1.0 },
  'general': { name: 'General Store', specialties: ['gear', 'ammo', 'drug'], markup: 1.3 },
  'ripper-doc': { name: 'Ripperdoc', specialties: ['cyberware'], markup: 1.5 },
  'tech': { name: 'Tech Shop', specialties: ['gear', 'cyberware'], markup: 1.4 },
  'black-market': { name: 'Black Market', specialties: ['weapon', 'cyberware', 'drug', 'armor'], markup: 2.0 }
};

const locations = {
  'city-center': { name: 'City Center', description: 'High-end corporate district', qualityBonus: 0.3 },
  'corpo-plaza': { name: 'Corpo Plaza', description: 'Ultra-luxury corporate zone', qualityBonus: 0.5 },
  'watson': { name: 'Watson', description: 'Industrial immigrant district', qualityBonus: -0.2 },
  'westbrook': { name: 'Westbrook', description: 'Entertainment and luxury district', qualityBonus: 0.2 },
  'santo-domingo': { name: 'Santo Domingo', description: 'Manufacturing and working class', qualityBonus: -0.1 },
  'pacifica': { name: 'Pacifica', description: 'Abandoned tourist district', qualityBonus: -0.3 },
  'badlands': { name: 'Badlands', description: 'Nomad territory outside the city', qualityBonus: -0.4 }
};

function ShopGenerator() {
  const [allItems, setAllItems] = useState<ShopItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ShopItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentVendor, setCurrentVendor] = useState<Vendor | null>(null);
  const [filters, setFilters] = useState({
    type: 'all',
    priceRange: 'all',
    quality: 'all',
    search: '',
    sortBy: 'name',
    sortOrder: 'asc',
    hideZeroPrice: false
  });
  const [nightMarketMode, setNightMarketMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showDetailedStats, setShowDetailedStats] = useState(false);

  useEffect(() => {
    loadShopData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [allItems, filters, nightMarketMode]);

  const loadShopData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      console.log('Loading shop data...');
      const base = (import.meta as any).env?.BASE_URL || '/';
      const coreResponse = await fetch(base + 'data/core.json');
      
      if (!coreResponse.ok) {
        throw new Error(`Failed to load core data: ${coreResponse.status}`);
      }
      
      const coreData = await coreResponse.json();
      console.log('Core data loaded:', coreData?.length || 0, 'items');
      
      // Try to load additional packs
      const packs = ['black-chrome', 'dlc', 'internal'];
      let allData = Array.isArray(coreData) ? [...coreData] : [];
      
      for (const pack of packs) {
        try {
          const response = await fetch(base + `data/${pack}.json`);
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
              allData = [...allData, ...data];
              console.log(`Loaded ${pack}:`, data.length, 'items');
            }
          }
        } catch (error) {
          console.log(`Pack ${pack} not available:`, error);
        }
      }
      
      console.log('Total items loaded:', allData.length);
      
      // Filter for shop items with more flexible filtering
      const shopItems = allData.filter((item: any) => {
        if (!item || !item.type) return false;
        
        const hasPrice = item.system?.price?.market !== undefined || 
                        item.system?.cost !== undefined ||
                        item.system?.value !== undefined;
        
        const isShopItem = ['weapon', 'armor', 'cyberware', 'gear', 'drug', 'ammo', 'clothing'].includes(item.type);
        
        return isShopItem && (hasPrice || item.type === 'cyberware'); // Include cyberware even without price
      });
      
      console.log('Shop items filtered:', shopItems.length);
      
      setAllItems(shopItems);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load shop data:', error);
      setLoadError(error instanceof Error ? error.message : 'Unknown error');
      setIsLoading(false);
    }
  };

  const seededRandom = (seedStr: string): number => {
    let seed = 0;
    for (let i = 0; i < seedStr.length; i++) {
      seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
    }
    // LCG
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
        const price = item.system.price?.market || item.system.cost || item.system.value || 0;
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
    
    // Quality filter (normalize values to handle casing variants)
    if (filters.quality !== 'all') {
      filtered = filtered.filter(item => (item.system.quality || '').toLowerCase() === String(filters.quality).toLowerCase());
    }
    
    // Night Market mode - deterministically show only 30% of items based on ID
    if (nightMarketMode) {
      filtered = filtered.filter(item => seededRandom(`nightmarket-${item._id}`) < 0.3);
    }
    
    // Vendor filter - filter by vendor specialties and availability
    if (currentVendor) {
      filtered = filtered.filter(item => {
        // Check if item type matches vendor specialties
        const matchesSpecialty = currentVendor.specialties.includes(item.type);
        
        // Debug problematic items
        if (item.name.includes('Extra-Jointed') || item.name.includes('Heuristic') || item.name.includes('Reflex Co-Processor')) {
          console.log('Problematic item:', {
            name: item.name,
            type: item.type,
            vendorSpecialties: currentVendor.specialties,
            matchesSpecialty,
            vendorType: currentVendor.type
          });
        }
        
        if (!matchesSpecialty) return false;
        
        // Use deterministic availability based on item ID and vendor
        const seed = item._id.charCodeAt(0) + currentVendor.name.charCodeAt(0);
        const deterministicRandom = (seed % 100) / 100;
        return deterministicRandom < currentVendor.availability;
      });
    }
    
    // Apply sorting
    filtered = applySorting(filtered);
    
    setFilteredItems(filtered);
  };

  const normalizeQuality = (q?: string): number => {
    if (!q) return 1; // default to Standard
    const normalized = q.toLowerCase();
    const order = ['poor', 'standard', 'excellent', 'superior'];
    const idx = order.indexOf(normalized);
    return idx === -1 ? 1 : idx;
  };

  const applySorting = (items: ShopItem[]): ShopItem[] => {
    const sorted = [...items];
    
    sorted.sort((a, b) => {
      let compareValue = 0;
      
      switch (filters.sortBy) {
        case 'name':
          const nameA = a.name || 'Unknown';
          const nameB = b.name || 'Unknown';
          compareValue = nameA.localeCompare(nameB);
          break;
          
         case 'price':
          const priceA = Number(getItemPrice(a) || 0);
          const priceB = Number(getItemPrice(b) || 0);
          if (isNaN(priceA) && isNaN(priceB)) compareValue = 0;
          else if (isNaN(priceA)) compareValue = 1; // push NaN to end
          else if (isNaN(priceB)) compareValue = -1;
          else if (priceA === 0 && priceB > 0) compareValue = 1; // push €$0 to end
          else if (priceB === 0 && priceA > 0) compareValue = -1;
          else compareValue = priceA - priceB;
          break;
          
        case 'type':
          const typeA = a.type || 'unknown';
          const typeB = b.type || 'unknown';
          compareValue = typeA.localeCompare(typeB);
          break;
          
        case 'quality':
          const qA = normalizeQuality(a.system?.quality);
          const qB = normalizeQuality(b.system?.quality);
          compareValue = qA - qB;
          break;
          
        default:
          const defaultNameA = a.name || 'Unknown';
          const defaultNameB = b.name || 'Unknown';
          compareValue = defaultNameA.localeCompare(defaultNameB);
      }
      
      // Ensure we always return a consistent comparison
      if (compareValue === 0) {
        // Secondary sort by name for consistent ordering
        const nameA = a.name || 'Unknown';
        const nameB = b.name || 'Unknown';
        compareValue = nameA.localeCompare(nameB);
      }
      
      return filters.sortOrder === 'desc' ? -compareValue : compareValue;
    });
    
    return sorted;
  };

  const generateRandomVendor = (type?: keyof typeof vendorTypes, location?: keyof typeof locations) => {
    const vendorType = type || (Object.keys(vendorTypes) as Array<keyof typeof vendorTypes>)[Math.floor(Math.random() * Object.keys(vendorTypes).length)];
    const vendorLocation = location || (Object.keys(locations) as Array<keyof typeof locations>)[Math.floor(Math.random() * Object.keys(locations).length)];
    
    const typeInfo = vendorTypes[vendorType];
    const locationInfo = locations[vendorLocation];
    
    const vendorNames = {
      'weapons': ['Arsenal Arms', 'Iron Fist Firearms', 'Street Samurai Supply', 'Combat Zone Armory', 'Trigger Happy Trading'],
      'armor': ['Hardshell Protection', 'Bulletproof Boutique', 'Armor Tech Solutions', 'Steel Skin Supply', 'Combat Gear Central'],
      'clothing': ['Chrome Fashion', 'Neon Threads', 'Style Cypher', 'Urban Edge Clothing', 'Night City Couture'],
      'general': ['Everything Store', 'Urban Supplies', 'Street Corner Shop', 'Basic Needs Bazaar', 'Daily Essentials'],
      'ripper-doc': ['CyberCare Clinic', 'Chrome & Bone', 'Neural Networks', 'Flesh & Steel', 'Bio-Enhancement Lab'],
      'tech': ['Tech Haven', 'Circuit Central', 'Digital Dreams', 'Gadget Galaxy', 'Future Tech'],
      'black-market': ['Underground Exchange', 'Shadow Market', 'Off-Grid Goods', 'No Questions Asked', 'Contraband Corner']
    };
    
    const randomName = vendorNames[vendorType][Math.floor(Math.random() * vendorNames[vendorType].length)];
    
    const vendor: Vendor = {
      name: randomName,
      type: vendorType,
      location: vendorLocation,
      description: `${typeInfo.name} located in ${locationInfo.name}. ${locationInfo.description}`,
      specialties: typeInfo.specialties,
      markup: typeInfo.markup + (locationInfo.qualityBonus * 0.5), // Location affects pricing
      availability: Math.max(0.1, Math.min(1.0, 0.7 + locationInfo.qualityBonus)) // Better locations have more stock
    };
    
    setCurrentVendor(vendor);
    applyFilters();
  };

  const clearVendor = () => {
    setCurrentVendor(null);
    applyFilters();
  };

  const addToCart = (item: ShopItem) => {
    setCart(prev => {
      const existing = prev.find(cartItem => cartItem._id === item._id);
      if (existing) {
        return prev.map(cartItem => 
          cartItem._id === item._id 
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      } else {
        return [...prev, { ...item, quantity: 1 }];
      }
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(item => item._id !== itemId));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart(prev => prev.map(item => 
      item._id === itemId ? { ...item, quantity } : item
    ));
  };

  const getItemPrice = (item: ShopItem) => {
    if (!item || !item.system) return 0;
    
    let basePrice = 0;
    
    // Try multiple price fields in order of preference
    if (item.system.price?.market !== undefined && item.system.price.market !== null) {
      basePrice = item.system.price.market;
    } else if (item.system.cost !== undefined && item.system.cost !== null) {
      basePrice = item.system.cost;
    } else if (item.system.value !== undefined && item.system.value !== null) {
      basePrice = item.system.value;
    } else if (item.system.price !== undefined && item.system.price !== null) {
      basePrice = typeof item.system.price === 'number' ? item.system.price : 0;
    }
    
    // Ensure we have a valid number
    if (isNaN(basePrice) || basePrice < 0) {
      basePrice = 0;
    }
    
    return currentVendor ? Math.round(basePrice * currentVendor.markup) : basePrice;
  };

  const getItemStats = (item: ShopItem) => {
    const stats: string[] = [];
    
    if (item.type === 'weapon') {
      if (item.system.damage) stats.push(`Damage: ${item.system.damage}`);
      if (item.system.attackmod !== undefined && item.system.attackmod !== 0) stats.push(`Attack: ${item.system.attackmod > 0 ? '+' : ''}${item.system.attackmod}`);
      if (item.system.rof) stats.push(`ROF: ${item.system.rof}`);
      if (item.system.magazine?.max) stats.push(`Mag: ${item.system.magazine.max}`);
      if (item.system.weaponSkill) stats.push(`Skill: ${item.system.weaponSkill}`);
    }
    
    if (item.type === 'armor') {
      if (item.system.bodyLocation?.sp) stats.push(`Body SP: ${item.system.bodyLocation.sp}`);
      if (item.system.headLocation?.sp) stats.push(`Head SP: ${item.system.headLocation.sp}`);
      if (item.system.penalty) stats.push(`Penalty: -${item.system.penalty}`);
    }
    
    if (item.system.quality) stats.push(`Quality: ${item.system.quality}`);
    if (item.system.brand) stats.push(`Brand: ${item.system.brand}`);
    
    return stats;
  };

  const getTotalCost = () => {
    return cart.reduce((total, item) => 
      total + getItemPrice(item) * item.quantity, 0
    );
  };

  const exportCart = () => {
    const timestamp = new Date().toLocaleString();
    const vendorInfo = currentVendor ? 
      `Vendor: ${currentVendor.name} (${currentVendor.type})\nLocation: ${currentVendor.location}\nDescription: ${currentVendor.description}\n` : 
      'Direct Purchase\n';
    
    let exportText = `CYBERPUNK RED - PURCHASE RECEIPT\n`;
    exportText += `Date: ${timestamp}\n`;
    exportText += `Night Market Mode: ${nightMarketMode ? 'Yes' : 'No'}\n\n`;
    exportText += vendorInfo;
    exportText += `\n${'='.repeat(60)}\n`;
    exportText += `ITEMS PURCHASED:\n`;
    exportText += `${'='.repeat(60)}\n\n`;
    
    cart.forEach((item, index) => {
      const unitPrice = getItemPrice(item);
      const totalPrice = unitPrice * item.quantity;
      
      exportText += `${index + 1}. ${item.name}\n`;
      exportText += `   Type: ${item.type.charAt(0).toUpperCase() + item.type.slice(1)}\n`;
      exportText += `   Quantity: ${item.quantity}\n`;
      exportText += `   Unit Price: €$${unitPrice.toLocaleString()}\n`;
      exportText += `   Total Price: €$${totalPrice.toLocaleString()}\n`;
      
      if (item.system.quality) {
        exportText += `   Quality: ${item.system.quality}\n`;
      }
      if (item.system.brand) {
        exportText += `   Brand: ${item.system.brand}\n`;
      }
      
      // Add detailed stats for weapons
      if (item.type === 'weapon') {
        if (item.system.damage) exportText += `   Damage: ${item.system.damage}\n`;
        if (item.system.weaponType) exportText += `   Weapon Type: ${item.system.weaponType}\n`;
        if (item.system.rof) exportText += `   Rate of Fire: ${item.system.rof}\n`;
        if (item.system.magazine?.max) exportText += `   Magazine: ${item.system.magazine.max}\n`;
        if (item.system.weaponSkill) exportText += `   Skill Required: ${item.system.weaponSkill}\n`;
      }
      
      // Add detailed stats for armor
      if (item.type === 'armor') {
        if (item.system.bodyLocation?.sp) exportText += `   Body SP: ${item.system.bodyLocation.sp}\n`;
        if (item.system.headLocation?.sp) exportText += `   Head SP: ${item.system.headLocation.sp}\n`;
        if (item.system.penalty) exportText += `   Penalty: ${item.system.penalty}\n`;
      }
      
      // Add description if available
      if (item.system.description?.value) {
        const cleanDescription = item.system.description.value
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/&nbsp;/g, ' ')
          .trim();
        if (cleanDescription) {
          exportText += `   Description: ${cleanDescription}\n`;
        }
      }
      
      if (item.system.source) {
        exportText += `   Source: ${item.system.source.book}, p.${item.system.source.page}\n`;
      }
      
      exportText += `\n`;
    });
    
    exportText += `${'='.repeat(60)}\n`;
    exportText += `TOTAL COST: €$${getTotalCost().toLocaleString()}\n`;
    exportText += `${'='.repeat(60)}\n`;
    
    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cyberpunk-purchase-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearCart = () => {
    setCart([]);
  };

  return (
    <div className="shop-generator-enhanced">
      {isLoading && (
        <div className="loading-message">
          <h3>Loading Night City Shop...</h3>
          <p>Fetching items from the data packs...</p>
        </div>
      )}
      
      {loadError && (
        <div className="error-message">
          <h3>Error Loading Shop Data</h3>
          <p>{loadError}</p>
          <button onClick={loadShopData} className="retry-btn">Retry</button>
        </div>
      )}
      
      {!isLoading && !loadError && (
        <div className="shop-content-enhanced">
          <div className="shop-items-section-enhanced">
            {/* Vendor Generator Section */}
            <div className="section">
              <h2>Vendor Generator</h2>
              <div className="vendor-controls">
                <div className="controls">
                  <button onClick={() => generateRandomVendor()}>Generate Random Vendor</button>
                  <select onChange={(e) => generateRandomVendor(e.target.value as any)} defaultValue="">
                    <option value="">Choose Vendor Type</option>
                    <option value="weapons">Gun Shop</option>
                    <option value="armor">Armor Shop</option>
                    <option value="clothing">Clothing Store</option>
                    <option value="general">General Store</option>
                    <option value="ripper-doc">Ripperdoc</option>
                    <option value="tech">Tech Shop</option>
                    <option value="black-market">Black Market</option>
                  </select>
                  <select onChange={(e) => generateRandomVendor(undefined, e.target.value as any)} defaultValue="">
                    <option value="">Choose Location</option>
                    <option value="city-center">City Center</option>
                    <option value="corpo-plaza">Corpo Plaza</option>
                    <option value="watson">Watson</option>
                    <option value="westbrook">Westbrook</option>
                    <option value="santo-domingo">Santo Domingo</option>
                    <option value="pacifica">Pacifica</option>
                    <option value="badlands">Badlands</option>
                  </select>
                  {currentVendor && <button onClick={clearVendor}>Clear Vendor</button>}
                </div>
                
                {currentVendor && (
                  <div className="vendor-info">
                    <h3>{currentVendor.name}</h3>
                    <p><strong>Type:</strong> {vendorTypes[currentVendor.type].name}</p>
                    <p><strong>Location:</strong> {locations[currentVendor.location].name}</p>
                    <p><strong>Description:</strong> {currentVendor.description}</p>
                    <p><strong>Markup:</strong> {Math.round((currentVendor.markup - 1) * 100)}% above market price</p>
                    <p><strong>Stock Availability:</strong> {Math.round(currentVendor.availability * 100)}%</p>
                  </div>
                )}
              </div>
            </div>

            <div className="shop-filters-enhanced section">
              <h2>{currentVendor ? currentVendor.name : 'Night City Shop'}</h2>
              <p className="data-summary">
                {allItems.length} items loaded from data packs 
                {currentVendor && ` • Showing ${filteredItems.length} items available at this vendor`}
              </p>
              
              <div className="filter-controls">
                <label>
                  <input 
                    type="checkbox" 
                    checked={showDetailedStats} 
                    onChange={(e) => setShowDetailedStats(e.target.checked)} 
                  />
                  Show Detailed Stats
                </label>
              </div>
              
              <div className="filter-row">
                <div className="filter-group">
                  <label>Type:</label>
                  <select 
                    value={filters.type} 
                    onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                  >
                    <option value="all">All Items</option>
                    <option value="weapon">Weapons</option>
                    <option value="armor">Armor</option>
                    <option value="cyberware">Cyberware</option>
                    <option value="gear">Gear</option>
                    <option value="drug">Drugs</option>
                    <option value="ammo">Ammo</option>
                    <option value="clothing">Clothing</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label>Price Range:</label>
                  <select 
                    value={filters.priceRange} 
                    onChange={(e) => setFilters(prev => ({ ...prev, priceRange: e.target.value }))}
                  >
                    <option value="all">All Prices</option>
                    <option value="cheap">Cheap (≤ €$100)</option>
                    <option value="budget">Budget (€$100-500)</option>
                    <option value="standard">Standard (€$500-2K)</option>
                    <option value="expensive">Expensive (€$2K-10K)</option>
                    <option value="luxury">Luxury (€$10K+)</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label>Quality:</label>
                  <select 
                    value={filters.quality} 
                    onChange={(e) => setFilters(prev => ({ ...prev, quality: e.target.value }))}
                  >
                    <option value="all">All Quality</option>
                    <option value="poor">Poor</option>
                    <option value="standard">Standard</option>
                    <option value="excellent">Excellent</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label>Search:</label>
                  <input 
                    type="text" 
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    placeholder="Search items..."
                  />
                </div>

                <div className="filter-group">
                  <label>Sort by:</label>
                  <select 
                    value={filters.sortBy} 
                    onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                  >
                    <option value="name">Name</option>
                    <option value="price">Price</option>
                    <option value="type">Type</option>
                    <option value="quality">Quality</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label>Order:</label>
                  <select 
                    value={filters.sortOrder} 
                    onChange={(e) => setFilters(prev => ({ ...prev, sortOrder: e.target.value }))}
                  >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>
                </div>
              </div>

              <div className="mode-toggle">
                <label>
                  <input 
                    type="checkbox" 
                    checked={nightMarketMode}
                    onChange={(e) => setNightMarketMode(e.target.checked)}
                  />
                  Night Market Mode (Random Availability)
                </label>
                <label style={{ marginLeft: '16px' }}>
                  <input
                    type="checkbox"
                    checked={filters.hideZeroPrice}
                    onChange={(e) => setFilters(prev => ({ ...prev, hideZeroPrice: e.target.checked }))}
                  />
                  Hide €$0 items
                </label>
              </div>
            </div>

            <div className="section">
              <h3>Available Items ({filteredItems.length})</h3>
              <div className="items-grid-enhanced">
              {filteredItems.map(item => (
                <div key={item._id} className="shop-item-enhanced">
                  <div className="shop-item-header">
                    <h4 className="shop-item-title">{item.name || 'Unknown Item'}</h4>
                    <div className="shop-item-price">
                        €${getItemPrice(item).toLocaleString() || '0'}
                      </div>
                    </div>
                    
                    <div className="shop-item-meta">
                      <span className="meta-badge type">{item.type || 'unknown'}</span>
                      {item.system?.quality && (
                        <span className="meta-badge quality">{item.system.quality}</span>
                      )}
                      {item.system?.brand && (
                        <span className="meta-badge">{item.system.brand}</span>
                      )}
                    </div>

                    <div className="item-description-full">
                      {showDetailedStats && (
                        <div className="item-stats">
                          {getItemStats(item).map((stat, index) => (
                            <div key={index} className="stat-line">{stat}</div>
                          ))}
                        </div>
                      )}
                      
                      {item.system?.description?.value ? (
                        <div dangerouslySetInnerHTML={{ 
                          __html: item.system.description.value 
                        }} />
                      ) : (
                        <p>No description available.</p>
                      )}
                      
                      {currentVendor && currentVendor.markup !== 1 && (
                        <div className="markup-info">
                          Vendor markup: {Math.round((currentVendor.markup - 1) * 100)}%
                        </div>
                      )}
                    </div>

                    <div className="add-to-cart-section">
                      <input 
                        type="number" 
                        min="1" 
                        defaultValue="1" 
                        className="quantity-input"
                        id={`qty-${item._id}`}
                      />
                      <button 
                        onClick={() => {
                          const qtyInput = document.getElementById(`qty-${item._id}`) as HTMLInputElement;
                          const quantity = parseInt(qtyInput?.value || '1');
                          for (let i = 0; i < quantity; i++) {
                            addToCart(item);
                          }
                        }} 
                        className="add-to-cart-btn"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="shopping-cart-enhanced section">
            <h3>Shopping Cart ({cart.length} items)</h3>
            
            {cart.length === 0 ? (
              <p className="empty-cart">Cart is empty</p>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map(item => (
                    <div key={item._id} className="cart-item">
                      <div className="cart-item-info">
                        <h5>{item.name}</h5>
                        <span className="cart-item-price">€${getItemPrice(item).toLocaleString()}</span>
                      </div>
                      <div className="cart-item-controls">
                        <input 
                          type="number" 
                          min="1" 
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item._id, parseInt(e.target.value))}
                          className="quantity-input"
                        />
                        <button onClick={() => removeFromCart(item._id)} className="remove-btn">×</button>
                      </div>
                      <div className="cart-item-total">
                        €${(getItemPrice(item) * item.quantity).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="cart-summary">
                  <div className="cart-total">
                    <strong>Total: €${getTotalCost().toLocaleString()}</strong>
                  </div>
                  <div className="cart-actions">
                    <button onClick={exportCart} className="export-btn">Export Purchase List</button>
                    <button onClick={clearCart} className="clear-btn">Clear Cart</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ShopGenerator;

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export type ProductStatus = 'Draft' | 'Active' | 'Archived';

export type ProductDimensions = {
  length?: number;
  width?: number;
  height?: number;
  unit?: 'mm' | 'cm' | 'in';
};

export type ProductVariant = {
  id: string;
  label: string;
  sku?: string;
  price: number;
  originalPrice?: number;
  costPrice?: number;
  stock: number;
  image?: string;
  theme?: string;
  color?: string;
  size?: string;
  weight?: number; // grams
};

export type Product = {
  id: string;
  name: string;
  slug?: string;
  sku?: string;
  description: string;
  shortDescription?: string;
  price: number;
  originalPrice?: number;
  costPrice?: number;
  category: string;
  subcategory?: string;
  image: string;
  images?: string[];
  stock: number;
  lowStockThreshold?: number;
  material?: string;
  occasion?: string;
  dimensions?: ProductDimensions;
  weight?: number; // grams
  leadTimeDays?: number;
  packagingNotes?: string;
  isCustomizable?: boolean;
  isCancellable?: boolean;
  featured?: boolean;
  active?: boolean;
  status?: ProductStatus;
  badge?: string;
  tags?: string[];
  seoTitle?: string;
  seoDescription?: string;
  hasVariants?: boolean;
  variants?: ProductVariant[];
  createdAt?: string;
  updatedAt?: string;
};

export const INITIAL_CATALOG_PRODUCTS: Product[] = [
  {
    id: 'p-torsion-lamp',
    name: 'The Reveal Moonlight 3D Lamp',
    description: 'A single continuous twist, printed in one 31-hour run. Translucent PLA diffuses a warm 2700K ambient light.',
    price: 2499,
    category: '3D Lamps & Lighting',
    image: 'https://cdn.magicpatterns.com/patterns/generated-images/eefb0e2b-f6d8-484f-8434-f739499cadd1.jpg',
    images: [
      'https://cdn.magicpatterns.com/patterns/generated-images/eefb0e2b-f6d8-484f-8434-f739499cadd1.jpg',
      'https://cdn.magicpatterns.com/patterns/generated-images/83b18327-de19-478d-a859-452d271b9093.jpg'
    ],
    stock: 25,
    material: 'Plant PLA+ (Translucent)',
    isCustomizable: true,
    featured: true,
    active: true,
  },
  {
    id: 'p-facet-planter',
    name: 'Faceted Geometric Planter (4 Inch)',
    description: 'Faceted, watertight planter printed from 100% recycled plant-based PETG. Fits standard nursery pots.',
    price: 799,
    category: 'Planters & Decor',
    image: 'https://cdn.magicpatterns.com/patterns/generated-images/4c046c64-2dd5-452f-ae20-43bb00f1bd0d.jpg',
    images: [
      'https://cdn.magicpatterns.com/patterns/generated-images/4c046c64-2dd5-452f-ae20-43bb00f1bd0d.jpg',
      'https://cdn.magicpatterns.com/patterns/generated-images/abed8080-9f2b-4373-9a34-af54bb14d154.jpg'
    ],
    stock: 40,
    material: 'Recycled PETG',
    isCustomizable: false,
    featured: true,
    active: true,
  },
  {
    id: 'p-desk-organizer',
    name: 'Modular Interlocking Desk Organizer',
    description: 'Three interlocking desk trays with dovetail joint clips. Keeps cables, pens, and tools organized without glue.',
    price: 1249,
    category: 'Desk & Office',
    image: 'https://cdn.magicpatterns.com/patterns/generated-images/24c7b789-5335-4a53-8079-6b49922d4da0.jpg',
    images: [
      'https://cdn.magicpatterns.com/patterns/generated-images/24c7b789-5335-4a53-8079-6b49922d4da0.jpg',
      'https://cdn.magicpatterns.com/patterns/generated-images/93cc4e66-591b-4808-8b40-b242bf4ab44a.jpg'
    ],
    stock: 18,
    material: 'Matte PLA+ & TPU',
    isCustomizable: true,
    featured: true,
    active: true,
  },
  {
    id: 'p-articulated-dragon',
    name: 'Print-in-Place Articulated Dragon',
    description: 'Printed fully assembled with 38 living joints. Moves directly off the print bed. Tested to 5,000 cycles.',
    price: 649,
    category: 'Toys & Fidgets',
    image: 'https://cdn.magicpatterns.com/patterns/generated-images/1f4a4228-699a-4820-8294-0cbe59a5ca42.jpg',
    images: [
      'https://cdn.magicpatterns.com/patterns/generated-images/1f4a4228-699a-4820-8294-0cbe59a5ca42.jpg'
    ],
    stock: 50,
    material: 'Silk PLA+',
    isCustomizable: false,
    featured: true,
    active: true,
  },
  {
    id: 'p-spiral-vase',
    name: 'Spiral Stem Minimalist Vase',
    description: 'A tall single-wall spiral vase printed in continuous motion and internally sealed for fresh flower stems.',
    price: 1099,
    category: 'Planters & Decor',
    image: 'https://cdn.magicpatterns.com/patterns/generated-images/1859e32b-8f64-4316-b9e5-e0c9ebd1f4a7.jpg',
    images: [
      'https://cdn.magicpatterns.com/patterns/generated-images/1859e32b-8f64-4316-b9e5-e0c9ebd1f4a7.jpg'
    ],
    stock: 15,
    material: 'Sand PLA+',
    isCustomizable: false,
    featured: false,
    active: true,
  },
  {
    id: 'p-wall-hooks',
    name: 'Arc Heavy Duty Wall Hooks (Set of 3)',
    description: 'Solid infill wall hooks load-tested to 4kg each. Ships with anchors, screws, and drilling template.',
    price: 549,
    category: 'Desk & Office',
    image: 'https://cdn.magicpatterns.com/patterns/generated-images/8f8e8302-b32c-4ec0-a8a0-4b236e2e9e01.jpg',
    images: [
      'https://cdn.magicpatterns.com/patterns/generated-images/8f8e8302-b32c-4ec0-a8a0-4b236e2e9e01.jpg'
    ],
    stock: 30,
    material: 'Gyroid Infill PLA+',
    isCustomizable: false,
    featured: false,
    active: true,
  }
];

// Get all products
export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, 'products'));
      const products = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];

      if (products.length === 0) {
        return INITIAL_CATALOG_PRODUCTS;
      }

      return products.sort((a, b) =>
        (a.name || '').localeCompare(b.name || '')
      );
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// Add new product
export function useAddProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (product: Omit<Product, 'id'>) => {
      const docRef = await addDoc(collection(db, 'products'), product);
      return { id: docRef.id, ...product };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });
}

// Update product
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Product> & { id: string }) => {
      await updateDoc(doc(db, 'products', id), data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });
}

// Delete product
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'products', id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });
}



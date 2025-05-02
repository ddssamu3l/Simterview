"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface BreadcrumbItem {
  label: string;
  path: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

const Breadcrumbs = ({ items, className = '' }: BreadcrumbsProps) => {
  const pathname = usePathname();
  
  // If no items are provided, generate them from the pathname
  const breadcrumbItems = items || generateBreadcrumbsFromPath(pathname);

  return (
    <nav aria-label="Breadcrumb" className={`mb-4 ${className}`}>
      <ol className="flex flex-wrap items-center text-sm" itemScope itemType="https://schema.org/BreadcrumbList">
        <li className="breadcrumb-item" itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
          <Link href="/" itemProp="item" className="text-slate-400 hover:text-primary-100">
            <span itemProp="name">Home</span>
          </Link>
          <meta itemProp="position" content="1" />
          <span className="mx-2 text-slate-500">/</span>
        </li>
        
        {breadcrumbItems.map((item, index) => (
          <li 
            key={item.path} 
            className="breadcrumb-item" 
            itemProp="itemListElement" 
            itemScope 
            itemType="https://schema.org/ListItem"
          >
            {index < breadcrumbItems.length - 1 ? (
              <>
                <Link href={item.path} itemProp="item" className="text-slate-400 hover:text-primary-100">
                  <span itemProp="name">{item.label}</span>
                </Link>
                <meta itemProp="position" content={`${index + 2}`} />
                <span className="mx-2 text-slate-500">/</span>
              </>
            ) : (
              <>
                <span itemProp="name" className="text-slate-200">{item.label}</span>
                <meta itemProp="position" content={`${index + 2}`} />
              </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

// Helper function to generate breadcrumb items from a URL path
const generateBreadcrumbsFromPath = (path: string): BreadcrumbItem[] => {
  // Remove leading and trailing slashes
  const cleanPath = path.replace(/^\/|\/$/g, '');
  
  // Split path into segments
  const segments = cleanPath.split('/');
  
  // Map to create breadcrumb items
  const items: BreadcrumbItem[] = [];
  let currentPath = '';
  
  segments.forEach((segment) => {
    currentPath += `/${segment}`;
    
    // Convert slug to readable label (e.g., "custom-interview" -> "Custom Interview")
    const label = segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    items.push({
      label,
      path: currentPath,
    });
  });
  
  return items;
};

export default Breadcrumbs;
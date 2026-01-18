'use client';

export default function StructuredData() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Akmalaka',
    url: 'https://akmalaka.biznejon.uz',
    logo: 'https://akmalaka.biznejon.uz/logo.png',
    description: 'Rossiyadan yog\'och import va export boshqaruv tizimi. Wood import and export management system from Russia.',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'UZ',
      addressLocality: 'Toshkent',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      availableLanguage: ['Uzbek', 'Russian', 'English'],
    },
    sameAs: [
      'https://akmalaka.biznejon.uz',
    ],
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://akmalaka.biznejon.uz/search?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };

  const websiteData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Akmalaka',
    url: 'https://akmalaka.biznejon.uz',
    description: 'Yog\'och import/export boshqaruv tizimi',
    inLanguage: ['uz', 'ru', 'en'],
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://akmalaka.biznejon.uz/search?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };

  const breadcrumbData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Bosh sahifa',
        item: 'https://akmalaka.biznejon.uz',
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
      />
    </>
  );
}

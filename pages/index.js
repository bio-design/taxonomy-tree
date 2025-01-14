import dynamic from 'next/dynamic'

const TaxonomyTree = dynamic(() => import('../components/TaxonomyTree'), {
  ssr: false
})

export default function Home() {
  return <TaxonomyTree />
}

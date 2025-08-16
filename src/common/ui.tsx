
export function TaggedBox({ tag, children, className } : { tag? : React.ReactNode, children : React.ReactNode, className? : string }) {
  return <div className={`relative shadow-lg border border-gray-200 rounded-lg p-3 m-2 ${className}`}>
    {tag && <div className="absolute text-2xl -left-5 -translate-x-full">{tag}</div>}
    {children}
  </div>;
}

export function Title({children} : {children : React.ReactNode}) {
  return <>
  <h1 className={`text-5xl font-bold mt-8 text-stone-800`}>{children}</h1>
  <hr className="h-px my-8 bg-gray-400 border-0 mb-14" />
  </>;
}


export function Section({children} : {children : React.ReactNode}) {
  return <>
  <h1 className={`text-3xl font-bold mt-14 mb-0 text-stone-800`}>{children}</h1>
  <hr className="h-px my-8 bg-gray-200 border-0 mt-2 mb-4 " />
  </>;
}

export function SubSection({children} : {children : React.ReactNode}) {
  return <>
  <h2 className={`text-2xl font-bold mt-14 mb-0 text-stone-800`}>{children}</h2>
  <hr className="h-px my-8 bg-gray-200 border-0 mt-2 mb-4 " />
  </>;
}

export function Strong({children} : {children : React.ReactNode}) {
  return <span className="text-stone-800 font-bold">{children}</span>;
}

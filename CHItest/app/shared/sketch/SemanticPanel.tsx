import type { GroundTruthRelation, ImageDef } from '../types'

export function SemanticPanel({
  image,
  selectedLabel,
  onConfirm,
}: {
  image: ImageDef
  selectedLabel: string | null
  onConfirm: (relation: string) => void
}) {
  const relations = selectedLabel
    ? image.ground_truth.relations.filter((item) => item.from === selectedLabel || item.to === selectedLabel)
    : []

  return (
    <aside className="semantic-panel">
      <details>
        <summary>相关关系</summary>
        {!selectedLabel ? (
          <p className="hint">点选草图中的人物、物体或镜头后，这里会显示相关位置与朝向关系。</p>
        ) : relations.length === 0 ? (
          <p className="hint">当前选中项没有额外关系。</p>
        ) : (
          <ul className="semantic-list">
            {relations.map((item) => (
              <RelationRow key={`${item.from}-${item.relation}-${item.to}`} item={item} onConfirm={onConfirm} />
            ))}
          </ul>
        )}
      </details>
    </aside>
  )
}

function RelationRow({
  item,
  onConfirm,
}: {
  item: GroundTruthRelation
  onConfirm: (relation: string) => void
}) {
  const text = `${item.from} ${item.relation} ${item.to}`
  return (
    <li>
      <span>{text}</span>
      <button type="button" className="btn" onClick={() => onConfirm(text)}>
        记下
      </button>
    </li>
  )
}

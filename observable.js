export const Observable = (factory = () => {}) => {
  const observers = []

  const next = value =>
    Promise.all(observers.map(observer => observer(value)))

  const subscribe = next => observers.push(next)

  const filter = callback =>
    Observable(next =>
      subscribe(async value => (await callback(value)) && (await next(value)))
    )

  const map = callback =>
    Observable(next =>
      subscribe(async value => await next(await callback(value)))
    )

  const effect = callback =>
    Observable(next =>
      subscribe(async value => {
        await callback(value)
        await next(value)
      })
    )

  factory(next)

  return { next, subscribe, filter, map, effect }
}
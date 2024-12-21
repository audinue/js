export const Match = (cases = [], defaultMapper = x => x) =>
  Object.assign(
    value => {
      for (const [predicate, mapper] of cases) {
        if (predicate(value)) {
          return mapper(value)
        }
      }
      return defaultMapper(value)
    },
    {
      case (predicate, mapper) {
        return Match([...cases, [predicate, mapper]], defaultMapper)
      },
      default (mapper) {
        return Match(cases, mapper)
      }
    }
  )

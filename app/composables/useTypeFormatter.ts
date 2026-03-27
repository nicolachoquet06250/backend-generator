export const useTypeFormatter = () => {
  const { t } = useI18n();
  const { structures } = useDataStructures();

  const formatType = (tpe: any): string => {
    if (!tpe) return t('blocks.var.types.any');
    
    const kind = typeof tpe === 'object' ? (tpe.kind || 'object') : tpe;
    
    if (kind === 'array') {
      const el = typeof tpe === 'object' ? tpe.elementType : 'any';
      return `${t('blocks.var.types.array')}<${formatType(el)}>`;
    }
    
    if (kind === 'object') {
      const structId = typeof tpe === 'object' ? tpe.structId : (typeof tpe === 'string' && tpe !== 'object' ? tpe : '');
      const struct = structures.value.find(s => s.id === structId || s.name === structId);
      
      if (struct) {
        return `${t('blocks.var.types.object')}<${struct.name}>`;
      }
      
      // Cas spécial pour les structures par défaut req/res si elles ne sont pas dans les structures
      if (structId === 'req' || structId === 'Request') return `${t('blocks.var.types.object')}<Request>`;
      if (structId === 'res' || structId === 'Response') return `${t('blocks.var.types.object')}<Response>`;
      
      return t('blocks.var.types.object');
    }
    
    return t(`blocks.var.types.${kind || 'any'}`);
  };

  return {
    formatType
  };
};

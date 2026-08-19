class DomainUtils {
  static extractDomain(url) {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      return urlObj.hostname;
    } catch {
      return url;
    }
  }

  static matchesDomain(testDomain, protectedPattern) {
    if (!testDomain || !protectedPattern) return false;

    const cleanTest = testDomain.toLowerCase();
    const cleanPattern = protectedPattern.toLowerCase();

    if (cleanPattern === cleanTest) return true;

    if (cleanPattern.startsWith('*.')) {
      const baseDomain = cleanPattern.substring(2);
      return cleanTest.endsWith('.' + baseDomain) || cleanTest === baseDomain;
    }

    return false;
  }

  static isProtected(domain, protectedDomains) {
    if (!domain) return false;
    const cleanDomain = this.extractDomain(domain);
    return protectedDomains.some(pd =>
      this.matchesDomain(cleanDomain, pd.domain)
    );
  }

  static filterProtectedDomains(domains, protectedDomains) {
    return domains.filter(domain =>
      !this.isProtected(domain, protectedDomains)
    );
  }
}

module.exports = DomainUtils;
